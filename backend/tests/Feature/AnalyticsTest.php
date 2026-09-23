<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private function product(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'barcode' => 'ANA-' . random_int(100000, 999999),
            'name'    => 'Produk Analitik',
            'description' => '',
            'category' => 'Food',
            'price'   => 8000,
            'stock'   => 30,
            'is_promo'=> false,
            'promo'   => 0,
        ], $overrides));
    }

    private function paidOrder(Product $p, int $qty = 1, ?string $createdAt = null): Order
    {
        $user = User::create([
            'name'     => 'Uji Ana',
            'email'    => 'ana-' . random_int(10000, 99999) . '@example.test',
            'password' => bcrypt('password'),
        ]);

        $order = Order::create([
            'user_id'         => $user->id,
            'customer_name'   => 'Uji Ana',
            'phone'           => '628111',
            'address'         => 'Jl Uji',
            'courier'         => 'Same Day',
            'payment_mode'    => 'online',
            'payment_status'  => 'paid',
            'total_price'     => $p->price * $qty,
            'shipping_fee'    => 0,
            'discount'        => 0,
            'points_used'     => 0,
            'points_discount' => 0,
            'status'          => 'completed',
            'created_at'      => $createdAt ?? now(),
        ]);

        OrderItem::create([
            'order_id'   => $order->id,
            'product_id' => $p->id,
            'name'       => $p->name,
            'qty'        => $qty,
            'price'      => $p->price,
            'total'      => $p->price * $qty,
        ]);

        if ($createdAt !== null) {
            DB::table('orders')->where('id', $order->id)->update(['created_at' => $createdAt]);
        }

        return $order;
    }

    private function login()
    {
        $admin = User::create([
            'name'     => 'Owner',
            'email'    => 'owner-ana@example.test',
            'password' => bcrypt('password'),
            'role'     => 'admin',
        ]);
        return \Laravel\Sanctum\Sanctum::actingAs($admin);
    }

    public function testAnalyticsBasicStructureAndSummary()
    {
        $this->login();
        $p = $this->product(['price' => 10000, 'stock' => 2]);
        $this->paidOrder($p, 3, now()->subDays(2));
        $this->paidOrder($p, 1, now()->subDays(3));

        $res = $this->get('/admin/analytics.php?days=7');
        $res->assertOk()->assertJsonPath('status', 'success');

        $data = $res->json('data');
        $this->assertArrayHasKey('summary', $data);
        $this->assertArrayHasKey('hourly', $data);
        $this->assertArrayHasKey('weekday', $data);
        $this->assertArrayHasKey('price_bands', $data);
        $this->assertArrayHasKey('restock', $data);
        $this->assertArrayHasKey('dead_stock', $data);
        $this->assertEquals(40000, $data['summary']['revenue']);
        $this->assertEquals(2, $data['summary']['orders']);
        $this->assertEquals(4, $data['summary']['items_sold']);
        $this->assertEquals(20000, $data['summary']['aov']);
    }

    public function testAnalyticsComparisonPct()
    {
        $this->login();
        $p = $this->product(['price' => 5000]);

        // periode sekarang: 1 order; periode sebelumnya: 3 order
        $this->paidOrder($p, 1, now()->subDay());          // current window (days=7: last 7 days)
        $this->paidOrder($p, 3, now()->subDays(10));       // prev window

        $res = $this->get('/admin/analytics.php?days=7');
        $this->assertEquals(5000, $res->json('data.summary.revenue'));
        $this->assertEquals(1, $res->json('data.summary.orders'));
        // prev = 3 order 15000 => revenue turun 66.7%
        $this->assertEquals(-66.7, $res->json('data.summary.revenue_pct'));
    }

    public function testRestockReportStatuses()
    {
        $this->login();
        $runOut = $this->product(['name' => 'Laris Habis', 'price' => 1000, 'stock' => 0]);
        $paused = $this->product(['name' => 'Tenang Saja', 'price' => 3000, 'stock' => 100]);

        foreach (range(1, 6) as $i) {
            $this->paidOrder($runOut, 2, now()->subDays($i));
        }

        $res = $this->get('/admin/analytics.php?days=7');
        $rows = collect($res->json('data.restock'))->keyBy('name');

        // stok 0 + laku -> Habis & rekomendasi restock terhitung
        $this->assertEquals('Habis', $rows['Laris Habis']['status']);
        $this->assertTrue($rows['Laris Habis']['recommended'] > 0);
        // produk tanpa penjualan sama sekali TIDAK muncul di daftar restock
        $this->assertFalse($rows->has('Tenang Saja'));
        // produk terlaris-habis diurutkan paling atas
        $this->assertEquals('Laris Habis', $res->json('data.restock.0.name'));
        // namun produk tanpa laku masuk daftar dead stock
        $dead = collect($res->json('data.dead_stock'))->pluck('name');
        $this->assertTrue($dead->contains('Tenang Saja'));
    }

    public function testRestockUsesPaidOrdersOnly()
    {
        $this->login();
        $p = $this->product(['name' => 'Hanya Cash', 'price' => 1000, 'stock' => 10]);

        // order PAID 2 pcs -> dihitung (qty_sold = 2)
        $this->paidOrder($p, 2, now()->subDay());

        // order PENDING 10 pcs -> TIDAK dihitung
        $user = User::create([
            'name'     => 'Uji',
            'email'    => 'cash-' . random_int(10000, 99999) . '@example.test',
            'password' => bcrypt('password'),
        ]);
        $o = Order::create([
            'user_id'         => $user->id,
            'customer_name'   => 'Uji',
            'phone'           => '628111',
            'address'         => 'Jl Uji',
            'courier'         => 'Same Day',
            'payment_mode'    => 'online',
            'payment_status'  => 'pending',
            'total_price'     => 10000,
            'shipping_fee'    => 0,
            'discount'        => 0,
            'points_used'     => 0,
            'points_discount' => 0,
            'status'          => 'pending',
        ]);
        OrderItem::create([
            'order_id'   => $o->id,
            'product_id' => $p->id,
            'name'       => $p->name,
            'qty'        => 10,
            'price'      => 1000,
            'total'      => 10000,
        ]);

        $res = $this->get('/admin/analytics.php?days=7');
        $rows = collect($res->json('data.restock'))->keyBy('name');
        $this->assertEquals(2, $rows['Hanya Cash']['qty_sold']);
        $this->assertNotEquals(12, $rows['Hanya Cash']['qty_sold']);
    }

    public function testHourlyAndWeekdayBucketsAreComplete()
    {
        $this->login();
        $p = $this->product();
        $this->paidOrder($p, 1, now());

        $res = $this->get('/admin/analytics.php?days=7');
        $this->assertCount(24, $res->json('data.hourly'));
        $this->assertCount(7, $res->json('data.weekday'));

        $todayHour = (int) now()->format('G');
        $todayDow  = ((int) now()->format('w') + 6) % 7 + 1; // PHP 1=Senin .. mapping kami: 1=Minggu
        $mappedDow = ((int) now()->format('w') + 7) % 7 + 1;

        $hourRow = collect($res->json('data.hourly'))->firstWhere('hour', $todayHour);
        $this->assertEquals(1, $hourRow['total_orders']);

        $dowRow = collect($res->json('data.weekday'))->firstWhere('dow', $mappedDow);
        $this->assertEquals(1, $dowRow['total_orders']);
        $this->assertNotEquals(0, $dowRow['total_sales']);
    }

    public function testDeadStockExcludesSoldProducts()
    {
        $this->login();
        $sold = $this->product(['name' => 'Laku Deras', 'price' => 9000, 'stock' => 40]);
        $this->paidOrder($sold, 5, now()->subDay());

        $never = $this->product(['name' => 'Menganggur', 'price' => 12000, 'stock' => 15, 'category' => 'Household']);

        $res = $this->get('/admin/analytics.php?days=30');
        $names = collect($res->json('data.dead_stock'))->pluck('name');
        $this->assertTrue($names->contains('Menganggur'));
        $this->assertFalse($names->contains('Laku Deras'));
    }

    public function testPriceBandsConsistency()
    {
        $this->login();
        $murah = $this->product(['price' => 5000]);
        $mahal = $this->product(['price' => 120000]);
        $this->paidOrder($murah, 2);
        $this->paidOrder($mahal, 1);

        $res = $this->get('/admin/analytics.php?days=7');
        $bands = collect($res->json('data.price_bands'));

        $cheap = $bands->firstWhere('band', '< 10 rb');
        $rich  = $bands->firstWhere('band', '> 100 rb');
        $this->assertEquals(10000, $cheap['revenue']);
        $this->assertEquals(2, $cheap['items_sold']);
        $this->assertEquals(120000, $rich['revenue']);
    }
}