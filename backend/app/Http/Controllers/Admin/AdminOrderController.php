<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index()
    {
        $orders = Order::with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($o) {
                return [
                    'id'            => $o->id,
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
            'data'   => $orders,
        ]);
    }

    public function update(Request $request)
    {
        $data   = $request->all();
        $id     = (int) ($data['id'] ?? 0);
        $status = trim($data['status'] ?? '');

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

        $order->update(['status' => $status]);

        // Umumkan lunas manual (mis. pembayaran tunai walk-in atau konfirmasi via WA).
        if ($status === 'paid' && $order->payment_status !== 'paid') {
            $order->update([
                'payment_status' => 'paid',
                'payment_mode'   => $order->payment_mode ?: 'cash',
                'payment_method' => $order->payment_method ?: 'manual',
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
