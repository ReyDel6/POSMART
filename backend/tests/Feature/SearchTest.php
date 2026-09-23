<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    private function product(array $overrides = []): Product
    {
        $defaults = [
            'barcode'      => 'SRH-' . random_int(100000, 999999),
            'name'         => 'Susu UHT Kotak',
            'description'  => '',
            'category'     => 'Milk',
            'price'        => 6300,
            'stock'        => 50,
            'is_promo'     => false,
            'promo'        => 0,
        ];
        return Product::create(array_merge($defaults, $overrides));
    }

    private function makePaid(Product $p, int $qty = 3): void
    {
        $user = \App\Models\User::create([
            'name'     => 'Uji Pencarian ' . $p->id,
            'email'    => "uji-{$p->id}@example.test",
            'password' => bcrypt('password'),
        ]);

        $order = Order::create([
            'user_id'         => $user->id,
            'customer_name'   => 'Uji',
            'phone'           => '628111',
            'address'         => 'Jl Uji',
            'payment_mode'    => 'online',
            'courier'         => 'Same Day',
            'payment_status'  => 'paid',
            'total_price'     => $p->price * $qty,
            'shipping_fee'    => 0,
            'discount'        => 0,
            'points_used'     => 0,
            'points_discount' => 0,
            'status'          => 'completed',
        ]);
        OrderItem::create([
            'order_id'   => $order->id,
            'product_id' => $p->id,
            'name'       => $p->name,
            'qty'        => $qty,
            'price'      => $p->price,
            'total'      => $p->price * $qty,
        ]);
    }

    public function testSearchMatchesName()
    {
        $this->product(['name' => 'Kopi Susu Gula Aren']);
        $this->product(['name' => 'Teh Manis Dingin']);

        $res = $this->get('/get.product.php?search=Gula&per_page=10');
        $res->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonCount(1, 'data');
        $this->assertEquals('Kopi Susu Gula Aren', $res->json('data.0.name'));
    }

    public function testSearchMatchesDescription()
    {
        $this->product([
            'name'        => 'Roti Gandum',
            'description' => 'Roti tawar tinggi serat untuk sarapan sehat',
        ]);

        $res = $this->get('/get.product.php?search=sarapan&per_page=10');
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertEquals('Roti Gandum', $res->json('data.0.name'));
    }

    public function testSearchMatchesCategoryName()
    {
        $this->product(['name' => 'Minyak Goreng', 'category' => 'Household']);
        $this->product(['name' => 'Sabun Cuci Piring', 'category' => 'Household']);
        $this->product(['name' => 'Kopi Tubruk', 'category' => 'Beverage']);

        $res = $this->get('/get.product.php?search=Household&per_page=10');
        $res->assertOk()->assertJsonCount(2, 'data');
    }

    public function testSearchCaseInsensitiveAndMultiTerm()
    {
        $this->product(['name' => 'AQUA Air Mineral']);

        $res = $this->get('/get.product.php?search=aqua&per_page=10');
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertEquals('AQUA Air Mineral', $res->json('data.0.name'));
    }

    public function testSuggestionsReturnsTopSoldByPopularity()
    {
        $rare = $this->product(['name' => 'Snack Oreo']);
        $best = $this->product(['name' => 'Snack Ciki Ciki']);
        $this->makePaid($best, 20);
        $this->makePaid($rare, 2);

        $res = $this->get('/get.search_suggestions.php?q=Snack');
        $res->assertOk()->assertJsonPath('status', 'success');
        $names = collect($res->json('data'))->pluck('name');
        $this->assertCount(2, $names);
        $this->assertEquals('Snack Ciki Ciki', $names[0]);
        $this->assertTrue($names->contains('Snack Oreo'));
    }

    public function testSuggestionsRespectsLimitAndMatchesDescription()
    {
        for ($i = 1; $i <= 10; $i++) {
            $this->product(['name' => "Produk Ke-$i", 'description' => "teh segar rasa $i"]);
        }

        $res = $this->get('/get.search_suggestions.php?q=teh');
        $res->assertOk()->assertJsonCount(8, 'data');

        $none = $this->get('/get.search_suggestions.php?q=zzznone');
        $none->assertOk()->assertJsonCount(0, 'data');
    }

    public function testSuggestionsReturnDealField()
    {
        $this->product(['name' => 'Air Galon', 'category' => 'Beverage']);

        $res = $this->get('/get.search_suggestions.php?q=air');
        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertArrayHasKey('deal', $res->json('data.0'));
    }
}