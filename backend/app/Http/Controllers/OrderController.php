<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\MidtransService;
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
        $cartItems    = $data['items'] ?? [];

        // Mode bayar: 'online' (Midtrans/WA, default) atau 'cash' (walk-in/kasir langsung)
        $paymentMode = in_array(($data['payment_mode'] ?? ''), ['cash', 'online'], true)
            ? $data['payment_mode']
            : 'online';
        $isWalkIn = $paymentMode === 'cash';

        if ($isWalkIn) {
            if ($courier === '') $courier = 'walkin';
            if ($address === '') $address = 'Ambil di toko';
        }

        if ($customerName === '' || $phone === '' || ($address === '' && !$isWalkIn) || empty($cartItems)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data tidak lengkap atau keranjang kosong.',
            ], 422);
        }

        // Ongkir dihitung dari kurir di sisi server (selaras dengan logika frontend)
        $shippingFee = $isWalkIn ? 0 : ($courier === 'express' ? 20000 : 10000);

        try {
            $order = DB::transaction(function () use ($user, $customerName, $phone, $address, $courier, $cartItems, $shippingFee, $isWalkIn, $paymentMode) {
                $order = Order::create([
                    'user_id'       => $user->id,
                    'customer_name' => $customerName,
                    'phone'         => $phone,
                    'address'       => $address,
                    'courier'       => $courier,
                    'total_price'   => 0,
                    'status'        => $isWalkIn ? 'paid' : 'pending',
                    'payment_mode'  => $paymentMode,
                    'payment_status'=> $isWalkIn ? 'paid' : 'pending',
                    'payment_method'=> $isWalkIn ? 'cash' : null,
                    'payment_type'  => $isWalkIn ? 'cash' : null,
                    'paid_at'       => $isWalkIn ? now() : null,
                ]);

                $grandTotal = 0;

                foreach ($cartItems as $item) {
                    $productId = (int) ($item['id'] ?? 0);
                    $qtyBuy    = (int) ($item['qty'] ?? 0);

                    if ($productId <= 0 || $qtyBuy <= 0) {
                        throw new \Exception('Terdapat item dengan ID atau jumlah pembelian tidak valid.');
                    }

                    $product = Product::where('id', $productId)->lockForUpdate()->first();

                    if (!$product) {
                        throw new \Exception("Produk dengan ID $productId tidak ditemukan.");
                    }

                    if ($product->stock < $qtyBuy) {
                        throw new \Exception("Stok untuk produk '" . $product->name . "' tidak mencukupi. Sisa stok: " . $product->stock);
                    }

                    // Harga diambil dari database, bukan dari kiriman client
                    $unitPrice = (int) $product->price;

                    $product->decrement('stock', $qtyBuy);

                    OrderItem::create([
                        'order_id'   => $order->id,
                        'product_id' => $productId,
                        'qty'        => $qtyBuy,
                        'price'      => $unitPrice,
                        'total'      => $qtyBuy * $unitPrice,
                    ]);

                    $grandTotal += $qtyBuy * $unitPrice;
                }

                $order->update(['total_price' => $grandTotal + $shippingFee]);

                return $order;
            });

            return response()->json([
                'status'       => 'success',
                'message'      => $isWalkIn ? 'Pembayaran tunai selesai. Stok telah dikunci.' : 'Checkout berhasil! Stok telah diamankan.',
                'order_id'     => $order->id,
                'total_price'  => (int) $order->total_price,
                'payment_mode' => $order->payment_mode,
                'paid'         => $order->payment_status === 'paid',
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memproses checkout: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function snap(Request $request, MidtransService $midtrans)
    {
        $user    = $request->user();
        $orderId = (int) ($request->input('order_id') ?? 0);

        if ($orderId <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'ID order tidak valid.',
            ], 422);
        }

        $order = Order::where('id', $orderId)->where('user_id', $user->id)->first();
        if (!$order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Order tidak ditemukan.',
            ], 404);
        }

        if ($order->payment_status === 'paid') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Order ini sudah dibayar.',
            ], 422);
        }

        if ($order->payment_mode === 'cash') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Order tunai tidak memerlukan pembayaran online.',
            ], 422);
        }

        // Pembayaran online belum dikonfigurasi -> frontend memakai alur lama (WA).
        if (!$midtrans->configured()) {
            return response()->json([
                'status'  => 'disabled',
                'message' => 'Pembayaran online belum dikonfigurasi.',
            ]);
        }

        // Token Snap lama masih valid -> pakai ulang agar tidak dobel transaksi.
        if ($order->snap_token && $order->snap_redirect_url) {
            return response()->json([
                'status'       => 'success',
                'snap_token'   => $order->snap_token,
                'redirect_url' => $order->snap_redirect_url,
                'client_key'   => $midtrans->clientKey(),
                'snap_js_url'  => $midtrans->snapJsUrl(),
            ]);
        }

        $order->load('items.product');

        $items = [];
        foreach ($order->items as $item) {
            $items[] = [
                'id'       => (string) $item->product_id,
                'price'    => (int) $item->price,
                'quantity' => (int) $item->qty,
                'name'     => mb_substr($item->product?->name ?? ('Produk #' . $item->product_id), 0, 49),
            ];
        }

        $shippingFee = $order->courier === 'express' ? 20000 : 10000;
        if ($shippingFee > 0) {
            $items[] = [
                'id'       => 'SHIPPING',
                'price'    => $shippingFee,
                'quantity' => 1,
                'name'     => 'Ongkos Kirim',
            ];
        }

        $midtransOrderId = config('midtrans.order_prefix') . '-' . $order->id;
        $notificationUrl = rtrim(config('app.url'), '/') . '/midtrans/webhook.php';

        $frontendUrl = rtrim((string) env('FRONTEND_URL', $request->header('origin') ?: 'http://localhost:5173'), '/');

        $result = $midtrans->createSnapTransaction([
            'transaction_details' => [
                'order_id'     => $midtransOrderId,
                'gross_amount' => (int) $order->total_price,
            ],
            'item_details'          => $items,
            'customer_details'      => [
                'first_name' => mb_substr($order->customer_name, 0, 49),
                'phone'      => $order->phone,
            ],
            'credit_card'           => ['secure' => true],
            'expiry'                => ['unit' => 'minutes', 'duration' => 60],
            'payment_notification_url' => $notificationUrl,
            'callbacks'             => [
                'finish' => "{$frontendUrl}/OrderSuccess?order_id={$order->id}",
            ],
        ]);

        if ($result === null || empty($result['token']) || empty($result['redirect_url'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat pembayaran: ' . ($result['error_messages'][0] ?? 'Tidak dapat terhubung ke Midtrans.'),
            ], 502);
        }

        $order->update([
            'midtrans_order_id' => $midtransOrderId,
            'snap_token'        => $result['token'],
            'snap_redirect_url' => $result['redirect_url'],
        ]);

        return response()->json([
            'status'       => 'success',
            'snap_token'   => $result['token'],
            'redirect_url' => $result['redirect_url'],
            'client_key'   => $midtrans->clientKey(),
            'snap_js_url'  => $midtrans->snapJsUrl(),
        ], 201);
    }

    public function checkPaymentStatus(Request $request, MidtransService $midtrans)
    {
        $user    = $request->user();
        $orderId = (int) ($request->input('order_id') ?? 0);

        $order = Order::where('id', $orderId)->where('user_id', $user->id)->first();
        if (!$order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Order tidak ditemukan.',
            ], 404);
        }

        if (!$order->midtrans_order_id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Order ini tidak memiliki transaksi pembayaran Midtrans.',
            ], 422);
        }

        $status = $midtrans->getTransactionStatus($order->midtrans_order_id);
        if ($status === null || empty($status['status_code'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memeriksa status pembayaran dari Midtrans.',
            ], 502);
        }

        $paid = $midtrans->isPaid($status);

        if ($paid && $order->payment_status !== 'paid') {
            $order->update([
                'payment_status' => 'paid',
                'payment_method' => $status['payment_type'] ?? $status['payment_method'] ?? null,
                'payment_type'   => $status['payment_type'] ?? null,
                'paid_at'        => now(),
            ]);

            if ($order->status === 'pending') {
                $order->update(['status' => 'paid']);
            }
        } elseif (!$paid && in_array($status['transaction_status'] ?? '', ['expire', 'cancel', 'deny'], true) && $order->payment_status !== 'paid') {
            $order->update(['payment_status' => $status['transaction_status']]);
            // Stok yang tadi dikunci dikembalikan agar produk bisa dijual lagi.
            $order->releaseItemsStock();
        }

        return response()->json([
            'status'              => 'success',
            'payment_status'      => $order->payment_status,
            'transaction_status'  => $status['transaction_status'] ?? null,
            'paid'                => $paid,
        ]);
    }
}
