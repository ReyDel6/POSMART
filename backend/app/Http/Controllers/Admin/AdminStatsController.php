<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function index()
    {
        // 1. Total Penjualan (Revenue)
        $totalRevenue = (float) Order::sum('total_price');

        // 2. Total Transaksi
        $totalOrders = Order::count();

        // 3. Total Produk
        $totalProducts = Product::count();

        // 4. Jumlah Produk Stok Menipis (stok <= 5)
        $totalLowStock = Product::where('stock', '<=', 5)->count();

        // 5. Daftar Detail Produk Stok Menipis
        $lowStockProducts = Product::where('stock', '<=', 5)
            ->orderBy('stock', 'asc')
            ->limit(10)
            ->get(['id', 'barcode', 'name', 'stock', 'price', 'category']);

        // 6. Transaksi Terbaru (5 terakhir)
        $recentOrders = Order::with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($o) {
                return [
                    'id'            => $o->id,
                    'customer_name' => $o->customer_name,
                    'total_price'   => $o->total_price,
                    'status'        => $o->status,
                    'created_at'    => $o->created_at,
                    'cashier_name'  => $o->user?->name,
                ];
            });

        // 7. Penjualan Harian (Daily Sales untuk Line Chart)
        $dailySales = Order::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('IFNULL(SUM(total_price), 0) as total_sales'),
            DB::raw('COUNT(*) as total_orders')
        )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date', 'asc')
            ->get();

        // 8. Penjualan per Kategori per Hari
        $categorySalesDaily = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('products as p', 'oi.product_id', '=', 'p.id')
            ->select(
                DB::raw('DATE(o.created_at) as date'),
                'p.category',
                DB::raw('IFNULL(SUM(oi.total), 0) as total_sales'),
                DB::raw('IFNULL(SUM(oi.qty), 0) as total_qty')
            )
            ->groupBy(DB::raw('DATE(o.created_at)'), 'p.category')
            ->orderBy('date', 'asc')
            ->orderBy('total_sales', 'desc')
            ->get();

        // 9. Penjualan per Kategori Keseluruhan
        $categorySalesTotal = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('products as p', 'oi.product_id', '=', 'p.id')
            ->select(
                'p.category',
                DB::raw('IFNULL(SUM(oi.total), 0) as total_sales'),
                DB::raw('IFNULL(SUM(oi.qty), 0) as total_qty')
            )
            ->groupBy('p.category')
            ->orderBy('total_sales', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'summary' => [
                    'total_revenue'    => $totalRevenue,
                    'total_orders'     => $totalOrders,
                    'total_products'   => $totalProducts,
                    'total_low_stock'  => $totalLowStock,
                ],
                'daily_sales'         => $dailySales,
                'category_sales_daily' => $categorySalesDaily,
                'category_sales_total' => $categorySalesTotal,
                'low_stock_products'  => $lowStockProducts,
                'recent_orders'       => $recentOrders,
            ],
        ]);
    }
}
