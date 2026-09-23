<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\ShippingZone;
use App\Models\User;
use App\Models\UserPoint;
use App\Services\LoyaltyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoyaltyPointsTest extends TestCase
{
    use RefreshDatabase;

    private function deactivateSeededZones(): void
    {
        ShippingZone::query()->delete();
        Setting::query()->delete();
    }

    private function makeStore(): void
    {
        Setting::create(['key' => 'point_earning_rate', 'value' => '1']);
        Setting::create(['key' => 'point_redeem_rate', 'value' => '50']);
    }

    private function user(int $points = 0, string $email = 'buyer@t.dev', string $role = 'user'): User
    {
        return User::create(['name' => 'Buyer', 'email' => $email, 'password' => 'password', 'role' => $role, 'points' => $points]);
    }

    private function product(int $price = 8000): Product
    {
        return Product::create([
            'barcode' => 'POINT-' . random_int(100000, 999999),
            'name'    => 'Produk Poin',
            'price'   => $price,
            'category'=> 'Food',
            'stock'   => 10,
            'image'   => 'placeholder.jpg',
        ]);
    }

    private function makeOrder(User $user, Product $product, int $pointsUsed = 0): Order
    {
        Sanctum::actingAs($user);

        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Poin 1',
            'payment_mode'  => 'online',
            'points_used'   => $pointsUsed,
            'items'         => [['id' => $product->id, 'qty' => 1]],
        ])->assertStatus(201);

        return Order::where('user_id', $user->id)->first();
    }

    public function test_earns_points_when_order_becomes_paid(): void
    {
        $this->deactivateSeededZones();
        $this->makeStore();

        $user    = $this->user();
        $product = $this->product(2500);
        $order   = $this->makeOrder($user, $product);

        // Tandai lunas via admin -> poin diberikan: intdiv(total, 1000) * 1.
        $order->update(['status' => 'paid', 'payment_status' => 'paid', 'paid_at' => now()]);
        app(LoyaltyService::class)->awardForOrder($order->fresh());

        $expected = intdiv((int) $order->total_price, 1000);

        $this->assertDatabaseHas('user_points_ledger', [
            'user_id'  => $user->id,
            'order_id' => $order->id,
            'type'     => 'earn',
            'amount'   => $expected,
        ]);
        $this->assertEquals($expected, $user->fresh()->points);

        // Idempoten: panggil ulang tidak menggandakan poin.
        app(LoyaltyService::class)->awardForOrder($order->fresh());
        $this->assertEquals($expected, $user->fresh()->points);
        $this->assertEquals(1, UserPoint::where('order_id', $order->id)->where('type', 'earn')->count());
    }

    public function test_no_points_for_unpaid_order(): void
    {
        $this->deactivateSeededZones();
        $this->makeStore();

        $user    = $this->user();
        $product = $this->product(2000);
        $order   = $this->makeOrder($user, $product); // masih pending

        app(LoyaltyService::class)->awardForOrder($order->fresh());

        $this->assertEquals(0, $user->fresh()->points);
        $this->assertDatabaseCount('user_points_ledger', 0);
    }

    public function test_redeem_points_reduces_total_and_deducts_balance(): void
    {
        $this->deactivateSeededZones();
        $this->makeStore();

        $user    = $this->user(100);
        $product = $this->product(20000);
        $order   = $this->makeOrder($user, $product, 40);

        // 1 poin = Rp50 -> 40 poin = Rp2000; subtotal 20000 + ongkir 10000 = 30000 -> total 28000.
        $this->assertEquals(40, $order->points_used);
        $this->assertEquals(2000, $order->points_discount);
        $this->assertEquals(28000, $order->total_price);

        // Saldo poin berkurang 40 dan tercatat 'redeem'.
        $this->assertEquals(60, $user->fresh()->points);
        $this->assertDatabaseHas('user_points_ledger', [
            'user_id'  => $user->id,
            'order_id' => $order->id,
            'type'     => 'redeem',
            'amount'   => -40,
        ]);
    }

    public function test_redeem_capped_by_balance(): void
    {
        $this->deactivateSeededZones();
        $this->makeStore();

        $user    = $this->user(10);
        $product = $this->product(5000);
        $order   = $this->makeOrder($user, $product, 9999); // cuma punya 10

        // Dipakai 10 -> diskon 10*50=500 -> subtotal 5000 + ongkir 10000 - 500 = 14500.
        $this->assertEquals(10, $order->points_used);
        $this->assertEquals(500, $order->points_discount);
        $this->assertEquals(14500, $order->total_price);
        $this->assertEquals(0, $user->fresh()->points);
    }

    public function test_points_restored_when_order_cancelled(): void
    {
        $this->deactivateSeededZones();
        $this->makeStore();

        $user    = $this->user(25);
        $product = $this->product(20000);
        $order   = $this->makeOrder($user, $product, 25);
        $this->assertEquals(0, $user->fresh()->points);

        // Batal manual via admin -> poin dipakai dikembalikan.
        $admin = $this->user(0, 'admin@t.dev', 'admin');
        Sanctum::actingAs($admin);

        $this->putJson('/admin/orders.php', ['id' => $order->id, 'status' => 'cancelled'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertEquals(25, $user->fresh()->points);
        $this->assertDatabaseCount('user_points_ledger', 0);
    }

    public function test_points_endpoint_returns_balance_and_ledger(): void
    {
        $this->deactivateSeededZones();
        $this->makeStore();

        $user = $this->user(77);
        UserPoint::create([
            'user_id'     => $user->id,
            'amount'      => 77,
            'type'        => 'earn',
            'description' => 'Poin dari pesanan #1',
            'created_at'  => now(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/user/points.php')
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.points', 77)
            ->assertJsonPath('data.redeem_rate', 50)
            ->assertJsonPath('data.ledger.0.amount', 77);
    }
}