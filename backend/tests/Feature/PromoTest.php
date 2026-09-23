<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PromoTest extends TestCase
{
    use RefreshDatabase;

    private int $zoneId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->zoneId = (int) ShippingZone::create(['name' => 'Gratis', 'fee' => 0, 'is_active' => true, 'sort' => 0])->id;
    }

    private function product(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'barcode' => 'TST-' . random_int(100000, 999999),
            'name'    => 'Produk Tes',
            'price'   => 10000,
            'category'=> 'Food',
            'rating'  => 0,
            'stock'   => 50,
            'is_promo'=> false,
            'promo'   => 0,
            'image'   => 'placeholder.jpg',
        ], $overrides));
    }

    public function test_product_percent_discount_is_applied_in_order(): void
    {
        $user    = User::create(['name' => 'A', 'email' => 'a@p.dev', 'password' => 'password', 'role' => 'user']);
        $product = $this->product(['price' => 10000, 'is_promo' => true, 'promo' => 10, 'stock' => 10]);

        Sanctum::actingAs($user);
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['id' => $product->id, 'qty' => 2]],
        ])->assertStatus(201);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(18000, (int) $order->total_price);
        $this->assertSame(2000, (int) $order->discount);

        $item = $order->items()->first();
        $this->assertSame(9000, (int) $item->price);
        $this->assertSame(18000, (int) $item->total);
    }

    public function test_block_discount_applies_best_tier_by_quantity(): void
    {
        $user    = User::create(['name' => 'B', 'email' => 'b@p.dev', 'password' => 'password', 'role' => 'user']);
        $product = $this->product(['price' => 10000, 'stock' => 50]);

        Promotion::create([
            'name'       => 'Beli Banyak',
            'type'       => 'block',
            'product_id' => $product->id,
            'tiers'      => [['min_qty' => 2, 'percent' => 10], ['min_qty' => 3, 'percent' => 15]],
            'active'     => true,
        ]);

        Sanctum::actingAs($user);

        // qty 1 -> belum kena tier
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['id' => $product->id, 'qty' => 1]],
        ])->assertStatus(201);
        $order1 = Order::where('user_id', $user->id)->first();
        $this->assertSame(10000, (int) $order1->total_price);
        $this->assertSame(0, (int) $order1->discount);

        // qty 3 -> tier tertinggi 15% -> 8500/item
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['id' => $product->id, 'qty' => 3]],
        ])->assertStatus(201);

        $order2 = Order::orderBy('id', 'desc')->first();
        $this->assertSame(25500, (int) $order2->total_price);
        $this->assertSame(4500, (int) $order2->discount);
        $this->assertSame(8500, (int) $order2->items()->first()->price);
    }

    public function test_buy_one_get_one_free(): void
    {
        $user    = User::create(['name' => 'C', 'email' => 'c@p.dev', 'password' => 'password', 'role' => 'user']);
        $product = $this->product(['price' => 6000, 'stock' => 20]);

        Promotion::create([
            'name'       => 'Beli 2 Gratis 1',
            'type'       => 'b1g1',
            'product_id' => $product->id,
            'buy_qty'    => 2,
            'free_qty'   => 1,
            'active'     => true,
        ]);

        Sanctum::actingAs($user);

        // qty 3 -> bayar 2 (1 gratis)
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['id' => $product->id, 'qty' => 3]],
        ])->assertStatus(201);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(12000, (int) $order->total_price);
        $this->assertSame(6000, (int) $order->discount);

        // qty 5 -> 1 grup (2+1), gratis 1, bayar 4
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['id' => $product->id, 'qty' => 5]],
        ])->assertStatus(201);

        $order2 = Order::orderBy('id', 'desc')->first();
        $this->assertSame(24000, (int) $order2->total_price);
        $this->assertSame(6000, (int) $order2->discount);
    }

    public function test_invalid_promo_id_for_a_different_product_is_ignored(): void
    {
        $user    = User::create(['name' => 'D', 'email' => 'd@p.dev', 'password' => 'password', 'role' => 'user']);
        $productA = $this->product(['price' => 10000, 'stock' => 20]);
        $productB = $this->product(['price' => 5000, 'stock' => 20]);

        $promo = Promotion::create([
            'name'       => 'Diskon A',
            'type'       => 'b1g1',
            'product_id' => $productA->id,
            'buy_qty'    => 2,
            'free_qty'   => 1,
            'active'     => true,
        ]);

        Sanctum::actingAs($user);
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['id' => $productB->id, 'qty' => 3, 'promo_id' => $promo->id]],
        ])->assertStatus(201);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(15000, (int) $order->total_price);
        $this->assertSame(0, (int) $order->discount);
    }

    public function test_bundle_discount_and_stock(): void
    {
        $user  = User::create(['name' => 'E', 'email' => 'e@p.dev', 'password' => 'password', 'role' => 'user']);
        $itemA = $this->product(['price' => 10000, 'stock' => 10]);
        $itemB = $this->product(['price' => 5000, 'stock' => 10]);

        $bundle = Promotion::create([
            'name'         => 'Paket Hemat',
            'type'         => 'bundle',
            'items'        => [['product_id' => $itemA->id, 'qty' => 2], ['product_id' => $itemB->id, 'qty' => 1]],
            'bundle_price' => 15000,
            'active'       => true,
        ]);

        Sanctum::actingAs($user);
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['bundle_id' => $bundle->id, 'qty' => 1]],
        ])->assertStatus(201);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(15000, (int) $order->total_price);
        $this->assertSame(10000, (int) $order->discount);

        // Stok semua komponen terpotong & tercatat sebagai order_item.
        $this->assertSame(8, $itemA->fresh()->stock);
        $this->assertSame(9, $itemB->fresh()->stock);
        $this->assertSame(2, $order->items()->count());
    }

    public function test_bundle_insufficient_stock_is_rejected(): void
    {
        $user  = User::create(['name' => 'F', 'email' => 'f@p.dev', 'password' => 'password', 'role' => 'user']);
        $itemA = $this->product(['price' => 10000, 'stock' => 1]);
        $itemB = $this->product(['price' => 5000, 'stock' => 5]);

        $bundle = Promotion::create([
            'name'         => 'Paket',
            'type'         => 'bundle',
            'items'        => [['product_id' => $itemA->id, 'qty' => 2], ['product_id' => $itemB->id, 'qty' => 1]],
            'bundle_price' => 15000,
            'active'       => true,
        ]);

        Sanctum::actingAs($user);
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['bundle_id' => $bundle->id, 'qty' => 1]],
        ])->assertStatus(400);

        $this->assertSame(1, $itemA->fresh()->stock);
        $this->assertSame(5, $itemB->fresh()->stock);
        $this->assertSame(0, Order::count());
        $this->assertSame(0, OrderItem::count());
    }

    public function test_inactive_promo_is_not_applied(): void
    {
        $user    = User::create(['name' => 'G', 'email' => 'g@p.dev', 'password' => 'password', 'role' => 'user']);
        $product = $this->product(['price' => 10000, 'stock' => 10]);

        Promotion::create([
            'name'       => 'Mati',
            'type'       => 'b1g1',
            'product_id' => $product->id,
            'buy_qty'    => 2,
            'free_qty'   => 1,
            'active'     => false,
        ]);

        Sanctum::actingAs($user);
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'shipping_zone_id' => $this->zoneId,
            'items'         => [['id' => $product->id, 'qty' => 3]],
        ])->assertStatus(201);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(30000, (int) $order->total_price);
        $this->assertSame(0, (int) $order->discount);
    }

    public function test_public_promotions_endpoint_lists_deals_and_bundles(): void
    {
        $product = $this->product(['price' => 10000, 'stock' => 20]);
        Promotion::create([
            'name'       => 'Diskon Blok',
            'type'       => 'block',
            'product_id' => $product->id,
            'tiers'      => [['min_qty' => 2, 'percent' => 10]],
            'active'     => true,
        ]);
        $bundle = Promotion::create([
            'name'         => 'Paket',
            'type'         => 'bundle',
            'items'        => [['product_id' => $product->id, 'qty' => 2]],
            'bundle_price' => 15000,
            'active'       => true,
        ]);

        $this->getJson('/get.promotions.php')
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data.deals')
            ->assertJsonCount(1, 'data.bundles')
            ->assertJsonPath('data.bundles.0.bundle_id', (int) $bundle->id)
            ->assertJsonPath('data.bundles.0.save', 5000);
    }

    public function test_admin_can_create_and_delete_promo(): void
    {
        $admin   = User::create(['name' => 'Admin', 'email' => 'h@p.dev', 'password' => 'password', 'role' => 'admin']);
        $product = $this->product(['price' => 10000, 'stock' => 20]);

        Sanctum::actingAs($admin);

        $this->postJson('/admin/promos.php', [
            'name'       => 'Promo Baru',
            'type'       => 'b1g1',
            'product_id' => $product->id,
            'buy_qty'    => 2,
            'free_qty'   => 1,
        ])->assertStatus(201)->assertJsonPath('status', 'success');

        $promo = Promotion::where('name', 'Promo Baru')->first();
        $this->assertNotNull($promo);
        $this->assertSame('b1g1', $promo->type);

        $this->getJson('/admin/promos.php')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->deleteJson('/admin/promos.php?id=' . $promo->id)
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertNull(Promotion::find($promo->id));
    }
}