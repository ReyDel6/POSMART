<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QrisPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        ShippingZone::query()->delete();
        config(['midtrans.server_key' => 'SB-Mid-test-server-key']);
        config(['midtrans.client_key' => 'SB-Mid-client-key']);
        config(['midtrans.order_prefix' => 'POS']);
    }

    private function user(string $role = 'user'): User
    {
        return User::create(['name' => 'Buyer', 'email' => 'buyer@t.dev', 'password' => 'password', 'role' => $role]);
    }

    private function product(): Product
    {
        return Product::create([
            'barcode' => 'QRIS-' . random_int(100000, 999999),
            'name'    => 'Produk QRIS',
            'price'   => 8000,
            'category'=> 'Food',
            'stock'   => 10,
            'image'   => 'placeholder.jpg',
        ]);
    }

    private function makeOrder(User $user, Product $product): Order
    {
        Sanctum::actingAs($user);

        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. QRIS 1',
            'courier'       => 'regular',
            'payment_mode'  => 'online',
            'items'         => [['id' => $product->id, 'qty' => 1]],
        ])->assertStatus(201);

        return Order::where('user_id', $user->id)->first();
    }

    public function test_qris_charge_returns_qr_string_and_updates_order(): void
    {
        Http::fake([
            'api.sandbox.midtrans.com/v2/charge' => Http::response([
                'status_code' => '201',
                'qr_string'   => '00020101021126650009COM.TOKOPEDIA...010211COM.GO-PAYQRIS...',
                'qr_url'      => 'data:text/plain;charset=utf-8,000201...',
            ], 201),
        ]);

        $user    = $this->user();
        $product = $this->product();
        $order   = $this->makeOrder($user, $product);

        Sanctum::actingAs($user);

        $this->postJson('/cart/midtrans_charge.php', ['order_id' => $order->id, 'group' => 'qris'])
            ->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('type', 'qris')
            ->assertJsonPath('qr_string', '00020101021126650009COM.TOKOPEDIA...010211COM.GO-PAYQRIS...')
            ->assertJsonPath('total_price', (int) $order->total_price);

        $order->refresh();
        $this->assertEquals('qris', $order->payment_method);
        $this->assertEquals('00020101021126650009COM.TOKOPEDIA...010211COM.GO-PAYQRIS...', $order->qr_string);
        $this->assertStringContainsString('-QR-', (string) $order->midtrans_order_id);
    }

    public function test_qris_charge_fails_gracefully_when_midtrans_error(): void
    {
        Http::fake([
            'api.sandbox.midtrans.com/v2/charge' => Http::response([
                'status_code' => '400',
                'error_messages' => ['QRIS transaction requires GPN acquirer.'],
            ], 400),
        ]);

        $user    = $this->user();
        $product = $this->product();
        $order   = $this->makeOrder($user, $product);

        Sanctum::actingAs($user);

        $this->postJson('/cart/midtrans_charge.php', ['order_id' => $order->id, 'group' => 'qris'])
            ->assertStatus(502)
            ->assertJsonPath('status', 'error');

        $order->refresh();
        $this->assertNull($order->qr_string);
    }

    public function test_non_qris_group_returns_use_snap(): void
    {
        Http::fake();

        $user    = $this->user();
        $product = $this->product();
        $order   = $this->makeOrder($user, $product);

        Sanctum::actingAs($user);

        $this->postJson('/cart/midtrans_charge.php', ['order_id' => $order->id, 'group' => 'ewallet'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'use_snap')
            ->assertJsonPath('method', 'ewallet');
    }

    public function test_snap_passes_enabled_payments_for_group(): void
    {
        Http::fake([
            'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
                'token'        => 'snap-token-abc',
                'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-abc',
            ], 201),
        ]);

        $user    = $this->user();
        $product = $this->product();
        $order   = $this->makeOrder($user, $product);

        Sanctum::actingAs($user);

        $this->postJson('/cart/midtrans_snap.php', ['order_id' => $order->id, 'group' => 'ewallet'])
            ->assertStatus(201)
            ->assertJsonPath('status', 'success');

        Http::assertSent(function ($request) {
            $body = $request->data();
            return isset($body['enabled_payments'])
                && in_array('gopay', $body['enabled_payments'], true)
                && in_array('dana', $body['enabled_payments'], true);
        });

        $order->refresh();
        $this->assertEquals('snap-token-abc', $order->snap_token);
    }

    public function test_snap_without_group_omits_enabled_payments(): void
    {
        Http::fake([
            'app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
                'token'        => 'snap-token-all',
                'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-all',
            ], 201),
        ]);

        $user    = $this->user();
        $product = $this->product();
        $order   = $this->makeOrder($user, $product);

        Sanctum::actingAs($user);

        $this->postJson('/cart/midtrans_snap.php', ['order_id' => $order->id])
            ->assertStatus(201);

        Http::assertSent(fn ($request) => !isset($request->data()['enabled_payments']));
    }
}