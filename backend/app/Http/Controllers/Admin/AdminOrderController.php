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
                    'status'        => $o->status,
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
        $data = $request->all();

        Order::where('id', $data['id'])->update([
            'status' => $data['status'],
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Status transaksi berhasil diperbarui',
        ]);
    }
}
