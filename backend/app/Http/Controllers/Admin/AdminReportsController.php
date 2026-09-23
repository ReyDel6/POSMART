<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminReportsController extends Controller
{
    public function index(Request $request)
    {
        $data = $this->compile($request);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'days'               => $data['days'],
                'summary'            => $data['summary'],
                'daily_sales'        => $data['daily_sales'],
                'category_sales'     => $data['category_sales'],
                'low_stock_products' => $data['low_stock_products'],
            ],
        ]);
    }

    public function export(Request $request)
    {
        $data = $this->compile($request);

        $rows = [
            ['--- RINGKASAN PERIODE ---', '', ''],
            ['Periode (hari)', (string) $data['days'], ''],
            ['Total Omzet', (string) $data['summary']['total_revenue'], ''],
            ['Total Transaksi', (string) $data['summary']['total_orders'], ''],
            ['Jumlah Produk', (string) $data['summary']['total_products'], ''],
            ['Stok Menipis', (string) $data['summary']['total_low_stock'], ''],
            ['', '', ''],
            ['--- PENJUALAN HARIAN ---', '', ''],
            ['Tanggal', 'Transaksi', 'Omzet'],
        ];

        foreach ($data['daily_sales'] as $d) {
            $rows[] = [$d->date, (string) $d->total_orders, (string) $d->total_sales];
        }

        $rows[] = ['', '', ''];
        $rows[] = ['--- KONTRIBUSI KATEGORI ---', '', ''];
        $rows[] = ['Kategori', 'Jumlah Terjual', 'Omzet'];

        foreach ($data['category_sales'] as $c) {
            $rows[] = [$c['category'], (string) $c['total_qty'], (string) $c['total_sales']];
        }

        $rows[] = ['', '', ''];
        $rows[] = ['--- STOK MENIPIS (<= 5) ---', '', ''];
        $rows[] = ['Nama', 'Stok', ''];

        foreach ($data['low_stock_products'] as $p) {
            $rows[] = [$p->name, (string) $p->stock, ''];
        }

        $stream = fopen('php://temp', 'r+');
        fwrite($stream, "\xEF\xBB\xBF"); // BOM agar Excel membaca UTF-8
        foreach ($rows as $row) {
            fputcsv($stream, $row, ';');
        }
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);

        $fileName = 'laporan-penjualan-' . now()->format('Y-m-d-His') . '.csv';

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
        ]);
    }

    private function compile(Request $request): array
    {
        $days  = max(1, min(365, (int) $request->input('days', 30)));
        $since = now()->subDays($days)->startOfDay();

        $dailySales = Order::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('IFNULL(SUM(total_price), 0) as total_sales'),
            DB::raw('COUNT(*) as total_orders')
        )
            ->where('created_at', '>=', $since)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'asc')
            ->get();

        $categorySales = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('products as p', 'oi.product_id', '=', 'p.id')
            ->select(
                'p.category',
                DB::raw('IFNULL(SUM(oi.total), 0) as total_sales'),
                DB::raw('IFNULL(SUM(oi.qty), 0) as total_qty')
            )
            ->where('o.created_at', '>=', $since)
            ->groupBy('p.category')
            ->orderBy('total_sales', 'desc')
            ->get();

        $totalRevenue   = (float) Order::where('created_at', '>=', $since)->sum('total_price');
        $totalOrders    = Order::where('created_at', '>=', $since)->count();
        $totalLowStock  = Product::where('stock', '<=', 5)->count();

        $lowStockProducts = Product::where('stock', '<=', 5)
            ->orderBy('stock', 'asc')
            ->limit(10)
            ->get(['id', 'barcode', 'name', 'stock', 'price', 'category']);

        return [
            'days'               => $days,
            'summary'            => [
                'total_revenue'   => $totalRevenue,
                'total_orders'    => $totalOrders,
                'total_products'  => Product::count(),
                'total_low_stock' => $totalLowStock,
            ],
            'daily_sales'        => $dailySales,
            'category_sales'     => $categorySales->map(fn ($c) => (array) $c),
            'low_stock_products' => $lowStockProducts,
        ];
    }
}