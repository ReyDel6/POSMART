<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private function paidOrder(User $user, Product $product): Order
    {
        $order = Order::create([
            'user_id'       => $user->id,
            'customer_name' => $user->name,
            'phone'         => '081234567890',
            'address'       => 'Jl. Tes 1',
            'courier'       => 'walkin',
            'total_price'   => (int) $product->price,
            'status'        => 'paid',
            'payment_mode'  => 'cash',
            'payment_status'=> 'paid',
            'payment_method'=> 'cash',
            'paid_at'       => now(),
        ]);

        OrderItem::create([
            'order_id'   => $order->id,
            'product_id' => $product->id,
            'qty'        => 1,
            'price'      => (int) $product->price,
            'total'      => (int) $product->price,
        ]);

        return $order;
    }

    public function test_only_buyer_can_review_and_rating_recomputed(): void
    {
        $buyer   = User::create(['name' => 'Buyer', 'email' => 'buyer@t.dev', 'password' => 'password', 'role' => 'user']);
        $stranger= User::create(['name' => 'Stranger', 'email' => 's@t.dev', 'password' => 'password', 'role' => 'user']);
        $product = Product::create([
            'barcode' => 'RVS-' . random_int(100000, 999999),
            'name'    => 'Produk Review',
            'price'   => 20000,
            'category'=> 'Food',
            'rating'  => 0,
            'stock'   => 10,
            'is_promo'=> false,
            'promo'   => 0,
            'image'   => 'placeholder.jpg',
        ]);

        $this->paidOrder($buyer, $product);

        // Orang yang belum pernah membeli -> dilarang menilai
        Sanctum::actingAs($stranger);
        $this->postJson('/product/review.php', [
            'product_id' => $product->id,
            'rating'     => 5,
            'comment'    => 'Bagus sekali',
        ])->assertStatus(403);

        // Pembeli boleh menilai
        Sanctum::actingAs($buyer);
        $this->postJson('/product/review.php', [
            'product_id' => $product->id,
            'rating'     => 5,
            'comment'    => 'Bagus sekali',
        ])->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertSame(5.0, (float) $product->fresh()->rating);

        // Ubah nilai menurun -> rating ikut dihitung ulang
        $this->postJson('/product/review.php', [
            'product_id' => $product->id,
            'rating'     => 3,
            'comment'    => 'Revisi',
        ])->assertStatus(200);

        $this->assertSame(3.0, (float) $product->fresh()->rating);

        // Pastikan review terlihat di endpoint publik
        $this->getJson('/product_reviews.php?product_id=' . $product->id)
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.reviews_count', 1)
            ->assertJsonPath('data.reviews.0.rating', 3);
    }
}