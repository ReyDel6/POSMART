<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderFlowTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'barcode' => 'TST-' . random_int(100000, 999999),
            'name'    => 'Produk Tes',
            'price'   => 10000,
            'category'=> 'Food',
            'rating'  => 0,
            'stock'   => 5,
            'is_promo'=> false,
            'promo'   => 0,
            'image'   => 'placeholder.jpg',
        ], $overrides));
    }

    public function test_create_order_decrements_stock(): void
    {
        $user    = User::create(['name' => 'A', 'email' => 'a@t.dev', 'password' => 'password', 'role' => 'user']);
        $product = $this->product(['stock' => 5]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'items'         => [['id' => $product->id, 'qty' => 2]],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertSame(3, $product->fresh()->stock);
        $order = Order::where('user_id', $user->id)->first();
        $this->assertNotNull($order);
        $this->assertSame('pending', $order->status);
        $this->assertSame('pending', $order->payment_status);
    }

    public function test_expired_webhook_restores_stock_once(): void
    {
        $user    = User::create(['name' => 'B', 'email' => 'b@t.dev', 'password' => 'password', 'role' => 'user']);
        $product = $this->product(['stock' => 5]);

        Sanctum::actingAs($user);

        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'items'         => [['id' => $product->id, 'qty' => 3]],
        ]);

        $order = Order::where('user_id', $user->id)->first();
        $order->update(['midtrans_order_id' => 'POS-' . $order->id]);

        $this->assertSame(2, $product->fresh()->stock);

        $statusCode  = '202';
        $grossAmount = number_format((int) $order->total_price, 0, ',', '');
        $signature   = hash('sha512', $order->midtrans_order_id . $statusCode . $grossAmount . config('midtrans.server_key'));

        // Webhook expire pertama -> stok kembali
        $this->postJson('/midtrans/webhook.php', [
            'order_id'          => $order->midtrans_order_id,
            'status_code'       => $statusCode,
            'gross_amount'      => $grossAmount,
            'signature_key'     => $signature,
            'transaction_status'=> 'expire',
        ])->assertStatus(200);

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame('expire', $order->fresh()->payment_status);
        $this->assertNotNull($order->fresh()->stock_released_at);

        // Webhook expire kedua (duplikat) -> stok TIDAK digandakan
        $this->postJson('/midtrans/webhook.php', [
            'order_id'          => $order->midtrans_order_id,
            'status_code'       => $statusCode,
            'gross_amount'      => $grossAmount,
            'signature_key'     => $signature,
            'transaction_status'=> 'expire',
        ])->assertStatus(200);

        $this->assertSame(5, $product->fresh()->stock);
    }

    public function test_admin_cancel_restores_stock(): void
    {
        $admin   = User::create(['name' => 'Admin', 'email' => 'admin@t.dev', 'password' => 'password', 'role' => 'admin']);
        $user    = User::create(['name' => 'C', 'email' => 'c@t.dev', 'password' => 'password', 'role' => 'user']);
        $product = $this->product(['stock' => 5]);

        Sanctum::actingAs($user);
        $this->postJson('/cart/create_order.php', [
            'customer_name' => 'Pembeli',
            'phone'         => '081234567890',
            'address'       => 'Jl. Merdeka 1',
            'courier'       => 'regular',
            'items'         => [['id' => $product->id, 'qty' => 2]],
        ]);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame(3, $product->fresh()->stock);

        Sanctum::actingAs($admin);
        $this->putJson('/admin/orders.php', ['id' => $order->id, 'status' => 'cancelled'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame('cancelled', $order->fresh()->payment_status);
    }

    public function test_cash_order_is_marked_paid_immediately(): void
    {
        $user    = User::create(['name' => 'D', 'email' => 'd@t.dev', 'password' => 'password', 'role' => 'cashier']);
        $product = $this->product(['stock' => 5]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/cart/create_order.php', [
            'payment_mode' => 'cash',
            'customer_name'=> 'Pelanggan',
            'phone'        => '081234567890',
            'items'        => [['id' => $product->id, 'qty' => 1]],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('payment_mode', 'cash')
            ->assertJsonPath('paid', true);

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame('paid', $order->status);
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('cash', $order->payment_method);
        $this->assertNotNull($order->paid_at);

        // Order tunai tidak boleh membuat Snap Midtrans
        $this->postJson('/cart/midtrans_snap.php', ['order_id' => $order->id])
            ->assertStatus(422);
    }
}