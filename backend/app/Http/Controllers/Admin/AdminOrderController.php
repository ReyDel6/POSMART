<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with('user:user_id,name')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->input('search'));
                $query->where(function ($inner) use ($search) {
                    $inner->where('order_id', is_numeric($search) ? (int) $search : 0)
                        ->orWhere('customer_name', 'like', '%' . $search . '%');
                });
            })
            ->when($request->filled('status') && $request->input('status') !== 'all', fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('created_at', '>=', $request->input('date_from')))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('created_at', '<=', $request->input('date_to')))
            ->orderBy('created_at', 'desc');

        $stats = (clone $query)->selectRaw('COUNT(*) as total, COALESCE(SUM(total_price), 0) as revenue')
            ->selectRaw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed")
            ->selectRaw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending")
            ->first();
        $orders = $query->paginate(min(50, max(1, (int) $request->input('per_page', 20))))
            ->through(function ($o) {
                return [
                    'id'            => $o->order_id,
                    'order_id'      => $o->order_id,
                    'customer_name' => $o->customer_name,
                    'phone'         => $o->phone,
                    'address'       => $o->address,
                    'courier'       => $o->courier,
                    'total_price'   => $o->total_price,
                    'discount'      => (int) $o->discount,
                    'points_used'   => (int) $o->points_used,
                    'points_discount' => (int) $o->points_discount,
                    'status'        => $o->status,
                    'payment_status' => $o->payment_status,
                    'payment_mode'   => $o->payment_mode,
                    'payment_method' => $o->payment_method,
                    'payment_type'   => $o->payment_type,
                    'paid_at'       => $o->paid_at,
                    'created_at'    => $o->created_at,
                    'cashier_name'  => $o->user?->name,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $orders->items(),
            'meta'   => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
                'revenue' => (int) $stats->revenue,
                'completed' => (int) $stats->completed,
                'pending' => (int) $stats->pending,
            ],
        ]);
    }

    public function show(Request $request)
    {
        $order = Order::with('items.product:id,name,price', 'user:id,name')->find((int) $request->query('id'));
        if (!$order) {
            return response()->json(['status' => 'error', 'message' => 'Transaksi tidak ditemukan.'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $order->id,
                'customer_name' => $order->customer_name,
                'phone' => $order->phone,
                'address' => $order->address,
                'courier' => $order->courier,
                'shipping_fee' => (int) $order->shipping_fee,
                'discount' => (int) $order->discount,
                'points_discount' => (int) $order->points_discount,
                'total_price' => $order->total_price,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'payment_mode' => $order->payment_mode,
                'created_at' => $order->created_at,
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->product?->name ?: 'Produk dihapus',
                    'qty' => (int) $item->qty,
                    'price' => (int) $item->price,
                    'total' => (int) $item->total,
                ]),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $data   = $request->all();
        $id     = (int) ($data['id'] ?? 0);
        $status = trim($data['status'] ?? '');
        $paymentMethod = trim((string) ($data['payment_method'] ?? ''));

        $allowed = ['pending', 'paid', 'processing', 'completed', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Status transaksi tidak valid.',
            ], 422);
        }

        $order = Order::find($id);
        if (!$order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Transaksi tidak ditemukan.',
            ], 404);
        }
        if ($status === 'paid' && $order->payment_status !== 'paid') {
            if ($paymentMethod !== '' && !in_array($paymentMethod, ['cash', 'qris', 'debit'], true)) {
                return response()->json(['status' => 'error', 'message' => 'Metode pembayaran tidak valid.'], 422);
            }
            if ($paymentMethod === 'cash' && (int) ($data['cash_received'] ?? 0) < (int) $order->total_price) {
                return response()->json(['status' => 'error', 'message' => 'Uang diterima belum mencukupi total transaksi.'], 422);
            }
        }

        $order->update(['status' => $status]);

        // Umumkan lunas manual (mis. pembayaran tunai walk-in atau konfirmasi via WA).
        if ($status === 'paid' && $order->payment_status !== 'paid') {
            $order->update([
                'payment_status' => 'paid',
                'payment_mode'   => $order->payment_mode ?: 'cash',
                'payment_method' => $paymentMethod ?: ($order->payment_method ?: 'manual'),
                'payment_type'   => $order->payment_type ?: 'manual',
                'paid_at'        => now(),
            ]);

            try {
                app(\App\Services\StoreNotifier::class)->orderPaid($order);
                app(\App\Services\LoyaltyService::class)->awardForOrder($order);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Gagal kirim notifikasi pembayaran: ' . $e->getMessage());
            }
        }

        // Saat transaksi dibatalkan manual, stok yang sempat dikunci dikembalikan.
        if ($status === 'cancelled' && $order->payment_status !== 'paid') {
            $order->update(['payment_status' => 'cancelled']);
            $order->releaseItemsStock();
            // Poin tukar yang dipakai dikembalikan ke member.
            app(\App\Services\LoyaltyService::class)->refundForOrder($order);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Status transaksi berhasil diperbarui.',
            'order'   => [
                'id'             => $order->id,
                'status'         => $order->status,
                'payment_status' => $order->payment_status,
                'payment_mode'   => $order->payment_mode,
                'payment_method' => $order->payment_method,
                'paid_at'        => $order->paid_at,
            ],
        ]);
    }
}
