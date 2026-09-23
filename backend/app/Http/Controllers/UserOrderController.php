<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class UserOrderController extends Controller
{
    public function index(Request $request)
    {
        $user    = $request->user();
        $filters = ['pending', 'paid', 'processing', 'completed', 'cancelled', 'expired'];
        $status  = trim($request->input('status', ''));

        $orders = Order::where('user_id', $user->id)
            ->with('items.product:id,name,image,price')
            ->when($status !== '' && in_array($status, $filters, true), function ($q) use ($status) {
                // "expired" = order yang payment_status-nya expire/cancel/deny.
                if ($status === 'expired') {
                    $q->whereIn('payment_status', ['expire', 'cancel', 'deny']);
                } else {
                    $q->where('status', $status);
                }
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($o) {
                return [
                    'id'             => (int) $o->id,
                    'customer_name'  => $o->customer_name,
                    'phone'          => $o->phone,
                    'address'        => $o->address,
                    'courier'        => $o->courier,
                    'total_price'    => (float) $o->total_price,
                    'status'         => $o->status,
                    'payment_status' => $o->payment_status,
                    'payment_mode'   => $o->payment_mode,
                    'payment_method' => $o->payment_method,
                    'paid_at'        => $o->paid_at,
                    'created_at'     => $o->created_at,
                    'items_count'    => $o->items->count(),
                    'items'          => $o->items->map(function ($i) {
                        return [
                            'product_id' => (int) $i->product_id,
                            'name'       => $i->product?->name ?? ('Produk #' . $i->product_id),
                            'image'      => $i->product?->image
                                ? '/product/' . $i->product->image
                                : null,
                            'qty'   => (int) $i->qty,
                            'price' => (float) $i->price,
                            'total' => (float) $i->total,
                        ];
                    }),
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $orders,
        ]);
    }

    public function show(Request $request)
    {
        $user    = $request->user();
        $orderId = (int) $request->input('id', 0);

        if ($orderId <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'ID order tidak valid.',
            ], 422);
        }

        $order = Order::where('id', $orderId)
            ->where('user_id', $user->id)
            ->with('items.product:id,name,image,price')
            ->first();

        if (!$order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Order tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id'             => (int) $order->id,
                'customer_name'  => $order->customer_name,
                'phone'          => $order->phone,
                'address'        => $order->address,
                'courier'        => $order->courier,
                'total_price'    => (float) $order->total_price,
                'status'         => $order->status,
                'payment_status' => $order->payment_status,
                'payment_mode'   => $order->payment_mode,
                'payment_method' => $order->payment_method,
                'paid_at'        => $order->paid_at,
                'created_at'     => $order->created_at,
                'items'          => $order->items->map(function ($i) {
                    return [
                        'product_id' => (int) $i->product_id,
                        'name'       => $i->product?->name ?? ('Produk #' . $i->product_id),
                        'image'      => $i->product?->image
                            ? '/product/' . $i->product->image
                            : null,
                        'qty'   => (int) $i->qty,
                        'price' => (float) $i->price,
                        'total' => (float) $i->total,
                    ];
                }),
            ],
        ]);
    }
}