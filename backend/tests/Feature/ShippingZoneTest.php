<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShippingZoneTest extends TestCase
{
    use RefreshDatabase;

    private function product(): Product
    {
        return Product::create([
            'barcode' => 'ZON-' . random_int(100000, 999999),
            'name'    => 'Produk Zona',
            'price'   => 5000,
            'category'=> 'Food',
            'stock'   => 10,
            'image'   => 'placeholder.jpg',
        ]);
    }

    private function user(): User
    {
        return User::create(['name' => 'Z', 'email' => 'z@t.dev', 'password' => 'password', 'role' => 'user']);
    }

    private function zone(string $name, int $fee, bool $active = true): ShippingZone
    {
        return ShippingZone::create([
            'name'      => $name,
            'fee'       => $fee,
            'is_active' => $active,
            'sort'      => (int) ShippingZone::count(),
        ]);
    }

    public function test_public_zones_only_list_active(): void
    {
        ShippingZone::query()->update(['is_active' => false]);

        $aktif = $this->zone('Dalam Kota', 10000);
        $this->zone('Jauh', 50000, false);

        $response = $this->getJson('/shipping_zones.php')
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $zones = $response->json('data');
        $this->assertCount(1, $zones);
        $this->assertSame((string) $aktif->id, (string) $zones[0]['id']);
        $this->assertSame(10000, (int) $zones[0]['fee']);
    }

    public function test_admin_crud_zones(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@t.dev', 'password' => 'password', 'role' => 'admin']);
        Sanctum::actingAs($admin);

        // Tambah
        $this->postJson('/admin/shipping_zones.php', ['name' => 'Luar Pulau', 'fee' => 35000])
            ->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $zone = ShippingZone::where('name', 'Luar Pulau')->first();
        $this->assertNotNull($zone);
        $this->assertSame(35000, (int) $zone->fee);
        $this->assertTrue((bool) $zone->is_active);

        $id = $zone->id;

        // Update
        $this->putJson('/admin/shipping_zones.php', ['id' => $id, 'name' => 'Luar Pulau Jauh', 'fee' => 40000, 'is_active' => false])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertSame('Luar Pulau Jauh', $zone->fresh()->name);
        $this->assertSame(40000, (int) $zone->fresh()->fee);
        $this->assertFalse((bool) $zone->fresh()->is_active);

        // Hapus
        $this->deleteJson('/admin/shipping_zones.php?id=' . $id)
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertNull($zone->fresh());
    }

    public function test_order_uses_zone_fee_from_server_not_client(): void
    {
        $this->zone('Zona A', 10000);
        $this->zone('Zona B', 25000);

        $user    = $this->user();
        $product = $this->product();

        Sanctum::actingAs($user);

        $zone = ShippingZone::where('name', 'Zona B')->first();

        $this->postJson('/cart/create_order.php', [
            'customer_name'    => 'Pembeli',
            'phone'            => '081234567890',
            'address'          => 'Jl. Tujuan 5',
            'courier'          => 'regular',
            'shipping_zone_id' => $zone->id,
            'items'            => [['id' => $product->id, 'qty' => 2]],
        ])->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('total_price', 5000 * 2 + 25000);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(25000, (int) $order->shipping_fee);
        $this->assertSame($zone->id, $order->shipping_zone_id);
        $this->assertSame('Zona B', $order->courier);
    }

    public function test_order_with_inactive_zone_falls_back_to_legacy_fee(): void
    {
        $this->zone('Mati', 99999, false);

        $user    = $this->user();
        $product = $this->product();
        $zone    = ShippingZone::where('name', 'Mati')->first();

        Sanctum::actingAs($user);

        $this->postJson('/cart/create_order.php', [
            'customer_name'    => 'Pembeli',
            'phone'            => '081234567890',
            'address'          => 'Jl. Tujuan 5',
            'courier'          => 'express',
            'shipping_zone_id' => $zone->id,
            'items'            => [['id' => $product->id, 'qty' => 1]],
        ])->assertStatus(201);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(20000, (int) $order->shipping_fee);
        $this->assertNull($order->shipping_zone_id);
        $this->assertSame('express', $order->courier);
    }

    public function test_cash_order_has_no_shipping_fee(): void
    {
        $this->zone('Dalam Kota', 10000);

        $user    = $this->user();
        $product = $this->product();

        Sanctum::actingAs($user);

        $this->postJson('/cart/create_order.php', [
            'payment_mode'     => 'cash',
            'customer_name'    => 'Pembeli',
            'phone'            => '081234567890',
            'items'            => [['id' => $product->id, 'qty' => 1]],
        ])->assertStatus(201);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(0, (int) $order->shipping_fee);
        $this->assertNull($order->shipping_zone_id);
        $this->assertSame('walkin', $order->courier);
    }

    public function test_guest_cannot_access_admin_zones(): void
    {
        $this->getJson('/admin/shipping_zones.php')->assertStatus(401);
    }
}