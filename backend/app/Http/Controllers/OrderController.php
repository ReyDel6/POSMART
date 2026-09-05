<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function create(Request $request)
    {
        $user = $request->user();

        $data = $request->all();

        $customerName = trim($data['customer_name'] ?? '');
        $phone        = trim($data['phone'] ?? '');
        $address      = trim($data['address'] ?? '');
        $courier      = trim($data['courier'] ?? '');
        $totalPrice   = (int) filter_var($data['total_price'] ?? 0, FILTER_VALIDATE_INT);
        $cartItems    = $data['items'] ?? [];

        if ($customerName === '' || $phone === '' || $address === '' || empty($cartItems) || $totalPrice <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data tidak lengkap atau keranjang kosong.',
            ], 422);
        }

        try {
            $order = DB::transaction(function () use ($user, $customerName, $phone, $address, $courier, $totalPrice, $cartItems) {
                $order = Order::create([
                    'user_id'       => $user->id,
                    'customer_name' => $customerName,
                    'phone'         => $phone,
                    'address'       => $address,
                    'courier'       => $courier,
                    'total_price'   => $totalPrice,
                    'status'        => 'pending',
                ]);

                foreach ($cartItems as $item) {
                    $productId = (int) $item['id'];
                    $qtyBuy    = (int) $item['qty'];

                    $product = Product::where('id', $productId)->lockForUpdate()->first();

                    if (!$product) {
                        throw new \Exception("Produk dengan ID $productId tidak ditemukan.");
                    }

                    if ($product->stock < $qtyBuy) {
                        throw new \Exception("Stok untuk produk '" . $product->name . "' tidak mencukupi. Sisa stok: " . $product->stock);
                    }

                    $product->decrement('stock', $qtyBuy);

                    OrderItem::create([
                        'order_id'   => $order->id,
                        'product_id' => $productId,
                        'qty'        => $qtyBuy,
                        'price'      => $item['price'],
                        'total'      => $qtyBuy * $item['price'],
                    ]);
                }

                return $order;
            });

            return response()->json([
                'status'   => 'success',
                'message'  => 'Checkout berhasil! Stok telah diamankan.',
                'order_id' => $order->id,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memproses checkout: ' . $e->getMessage(),
            ], 400);
        }
    }
}
