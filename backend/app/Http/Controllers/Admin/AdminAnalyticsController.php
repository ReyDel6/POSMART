<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    private const RESTOCK_DAYS = 14;

    public function index(Request $request)
    {
        $days = max(7, min(365, (int) $request->input('days', 30)));

        $since   = now()->subDays($days - 1)->startOfDay();
        $prevEnd = $since->copy();
        $prevSince = now()->subDays(2 * $days - 1)->startOfDay();

        $current = $this->paidTotals($since);
        $previous = $this->paidTotals($prevSince, $prevEnd);

        $hourly   = $this->hourlySales($since);
        $weekday  = $this->weekdaySales($since);
        $bands    = $this->priceBands($since);
        $restock  = $this->restockReport($since, $days);
        $deadStock = $this->deadStock($since);

        $pct = function ($now, $prev) {
            if ($prev <= 0) {
                return $now > 0 ? 100.0 : 0.0;
            }
            return round((($now - $prev) / $prev) * 100, 1);
        };

        return response()->json([
            'status' => 'success',
            'data'   => [
                'period'       => [
                    'days'     => $days,
                    'since'    => $since->toDateString(),
                    'until'    => now()->toDateString(),
                ],
                'summary'      => [
                    'revenue'      => round($current['revenue']),
                    'orders'       => $current['orders'],
                    'items_sold'   => $current['items'],
                    'aov'          => $current['orders'] > 0 ? round($current['revenue'] / $current['orders']) : 0,
                    'revenue_pct'  => $pct($current['revenue'], $previous['revenue']),
                    'orders_pct'   => $pct($current['orders'], $previous['orders']),
                    'projected'    => round($current['revenue'] / $days * 30),
                ],
                'hourly'       => $hourly,
                'weekday'      => $weekday,
                'price_bands'  => $bands,
                'restock'      => $restock['items'],
                'restock_stats' => $restock['stats'],
                'dead_stock'   => $deadStock,
            ],
        ]);
    }

    private function paidTotals($from, $to = null): array
    {
        $q = Order::where('payment_status', 'paid')->where('created_at', '>=', $from);
        if ($to) {
            $q->where('created_at', '<', $to);
        }

        $orders = (clone $q)->select(
            DB::raw('IFNULL(SUM(total_price), 0) as revenue'),
            DB::raw('COUNT(*) as cnt')
        )->first();

        $items = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->where('o.payment_status', 'paid')
            ->where('o.created_at', '>=', $from);
        if ($to) {
            $items->where('o.created_at', '<', $to);
        }
        $itemsSum = (clone $items)->select(DB::raw('IFNULL(SUM(oi.qty), 0) as qty'))->first();

        return [
            'revenue' => (float) $orders->revenue,
            'orders'  => (int) $orders->cnt,
            'items'   => (int) $itemsSum->qty,
        ];
    }

    private function hourlySales($since): array
    {
        $driver = DB::connection()->getDriverName();
        $hourExpr = $driver === 'sqlite'
            ? "CAST(STRFTIME('%H', o.created_at) AS INTEGER)"
            : "HOUR(o.created_at)";

        $rows = DB::table('orders as o')
            ->select(
                DB::raw("$hourExpr as hour"),
                DB::raw('IFNULL(SUM(o.total_price), 0) as total_sales'),
                DB::raw('COUNT(*) as total_orders')
            )
            ->where('o.payment_status', 'paid')
            ->where('o.created_at', '>=', $since)
            ->groupBy(DB::raw('hour'))
            ->orderBy('hour', 'asc')
            ->get()
            ->keyBy('hour');

        $out = [];
        for ($h = 0; $h < 24; $h++) {
            $row = $rows->get($h);
            $out[] = [
                'hour'        => $h,
                'total_sales' => round((float) ($row->total_sales ?? 0)),
                'total_orders'=> (int) ($row->total_orders ?? 0),
            ];
        }
        return $out;
    }

    private function weekdaySales($since): array
    {
        $names = [1 => 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

        $driver = DB::connection()->getDriverName();
        $dowExpr = $driver === 'sqlite'
            ? "(STRFTIME('%w', o.created_at) + 7) % 7 + 1"
            : "DAYOFWEEK(o.created_at)";

        $rows = DB::table('orders as o')
            ->select(
                DB::raw("$dowExpr as dow"),
                DB::raw('IFNULL(SUM(o.total_price), 0) as total_sales'),
                DB::raw('COUNT(*) as total_orders')
            )
            ->where('o.payment_status', 'paid')
            ->where('o.created_at', '>=', $since)
            ->groupBy(DB::raw('dow'))
            ->orderBy('dow', 'asc')
            ->get()
            ->keyBy('dow');

        $out = [];
        for ($d = 1; $d <= 7; $d++) {
            $row = $rows->get($d);
            $out[] = [
                'dow'         => $d,
                'name'        => $names[$d],
                'total_sales' => round((float) ($row->total_sales ?? 0)),
                'total_orders'=> (int) ($row->total_orders ?? 0),
            ];
        }
        return $out;
    }

    private function priceBands($since): array
    {
        $bands = [
            ['< 10 rb', 0, 9999],
            ['10–25 rb', 10000, 24999],
            ['25–50 rb', 25000, 49999],
            ['50–100 rb', 50000, 99999],
            ['> 100 rb', 100000, PHP_INT_MAX],
        ];

        $sold = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('products as p', 'oi.product_id', '=', 'p.id')
            ->where('o.payment_status', 'paid')
            ->where('o.created_at', '>=', $since)
            ->select(
                'p.id',
                'p.price',
                DB::raw('IFNULL(SUM(oi.qty), 0) as qty'),
                DB::raw('IFNULL(SUM(oi.total), 0) as rev')
            )
            ->groupBy('p.id', 'p.price')
            ->get();

        $out = [];
        foreach ($bands as [$label, $min, $max]) {
            $count = 0;
            $items = 0;
            $revenue = 0;
            foreach ($sold as $s) {
                if ($s->price >= $min && $s->price <= $max) {
                    $count++;
                    $items += (int) $s->qty;
                    $revenue += (float) $s->rev;
                }
            }
            $out[] = [
                'band'        => $label,
                'product_count' => $count,
                'items_sold'  => $items,
                'revenue'     => round($revenue),
            ];
        }
        return $out;
    }

    private function restockReport($since, int $days): array
    {
        $rows = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('products as p', 'oi.product_id', '=', 'p.id')
            ->where('o.payment_status', 'paid')
            ->where('o.created_at', '>=', $since)
            ->select(
                'p.id',
                'p.name',
                'p.image',
                'p.category',
                'p.price',
                'p.stock',
                DB::raw('IFNULL(SUM(oi.qty), 0) as qty_sold'),
                DB::raw('IFNULL(SUM(oi.total), 0) as revenue')
            )
            ->groupBy('p.id', 'p.name', 'p.image', 'p.category', 'p.price', 'p.stock')
            ->get();

        $items = $rows->map(function ($r) use ($days) {
            $avgDaily = $r->qty_sold > 0 ? $r->qty_sold / max(1, $days) : 0;
            $coverage = $avgDaily > 0 ? $r->stock / $avgDaily : PHP_INT_MAX;
            $recommended = $avgDaily > 0 ? max(0, (int) ceil($avgDaily * self::RESTOCK_DAYS) - $r->stock) : 0;

            if ($r->stock <= 0) {
                $status = 'Habis';
            } elseif ($avgDaily <= 0.02) {
                $status = 'Tidak Bergerak';
            } elseif ($coverage <= 4) {
                $status = 'Segera Restock';
            } elseif ($coverage <= 10) {
                $status = 'Amankan';
            } else {
                $status = 'Aman';
            }

            return [
                'id'            => (int) $r->id,
                'name'          => $r->name,
                'image'         => '/product/' . $r->image,
                'category'      => $r->category,
                'price'         => (int) $r->price,
                'stock'         => (int) $r->stock,
                'qty_sold'      => (int) $r->qty_sold,
                'revenue'       => round((float) $r->revenue),
                'avg_daily'     => round($avgDaily, 2),
                'coverage'      => $avgDaily > 0 ? round($coverage, 1) : null,
                'recommended'   => (int) $recommended,
                'status'        => $status,
            ];
        });

        $rank = ['Habis' => 0, 'Segera Restock' => 1, 'Amankan' => 2, 'Tidak Bergerak' => 3, 'Aman' => 4];

        $sorted = $items->sort(function ($a, $b) use ($rank) {
            $cmp = ($rank[$a['status']] ?? 5) <=> ($rank[$b['status']] ?? 5);
            if ($cmp !== 0) {
                return $cmp;
            }
            return $a['stock'] <=> $b['stock'];
        })->values();

        $stats = [
            'jenis_butuh'   => $sorted->filter(fn ($i) => $i['status'] === 'Segera Restock')->count(),
            'jenis_habis'   => $sorted->filter(fn ($i) => $i['status'] === 'Habis')->count(),
            'jenis_aman'    => $sorted->filter(fn ($i) => $i['status'] === 'Aman')->count(),
            'total_reorder' => $sorted->filter(fn ($i) => in_array($i['status'], ['Habis', 'Segera Restock', 'Amankan']))->sum('recommended'),
        ];

        return ['items' => $sorted->take(25)->all(), 'stats' => $stats];
    }

    private function deadStock($since): array
    {
        $productIds = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.payment_status', 'paid')
            ->where('orders.created_at', '>=', $since)
            ->pluck('order_items.product_id')
            ->unique()
            ->all();

        return Product::where('stock', '>', 0)
            ->whereNotIn('id', $productIds)
            ->orderBy('price', 'desc')
            ->limit(15)
            ->get(['id', 'barcode', 'name', 'category', 'price', 'stock'])
            ->map(fn ($p) => [
                'id'       => (int) $p->id,
                'barcode'  => $p->barcode,
                'name'     => $p->name,
                'category' => $p->category,
                'price'    => (int) $p->price,
                'stock'    => (int) $p->stock,
            ])
            ->values()
            ->all();
    }
}