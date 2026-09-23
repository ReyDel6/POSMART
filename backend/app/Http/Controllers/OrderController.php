<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ShippingZone;
use App\Services\LoyaltyService;
use App\Services\MidtransService;
use App\Services\PaymentMethods;
use App\Services\PromotionService;
use App\Services\StoreNotifier;
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
            $courier = 'walkin';
            if ($address === '') $address = 'Ambil di toko';
        }

        if ($customerName === '' || $phone === '' || ($address === '' && !$isWalkIn) || empty($cartItems)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data tidak lengkap atau keranjang kosong.',
            ], 422);
        }

        // Ongkir dihitung dari zona pengiriman (server-side, bukan dari client).
        $shippingFee = 0;
        $zone        = null;
        if (!$isWalkIn) {
            $zoneId = (int) ($data['shipping_zone_id'] ?? 0);
            $zone = ShippingZone::where('is_active', true)->find($zoneId);

            if ($zone) {
                $shippingFee = (int) $zone->fee;
                $courier     = $zone->name;
            } else {
                // Fallback untuk order lama/klien lawas yang hanya mengirim 'courier'.
                $shippingFee = $courier === 'express' ? 20000 : 10000;
                if ($courier === '') $courier = 'regular';
            }
        }

        try {
            $order = DB::transaction(function () use ($user, $customerName, $phone, $address, $courier, $zone, $shippingFee, $cartItems, $isWalkIn, $paymentMode, $data) {
                $order = Order::create([
                    'user_id'        => $user->id,
                    'customer_name'  => $customerName,
                    'phone'          => $phone,
                    'address'        => $address,
                    'courier'        => $courier,
                    'shipping_zone_id' => $zone?->id,
                    'shipping_fee'   => $shippingFee,
                    'total_price'    => 0,
                    'status'         => $isWalkIn ? 'paid' : 'pending',
                    'payment_mode'   => $paymentMode,
                    'payment_status' => $isWalkIn ? 'paid' : 'pending',
                    'payment_method' => $isWalkIn ? 'cash' : null,
                    'payment_type'   => $isWalkIn ? 'cash' : null,
                    'paid_at'        => $isWalkIn ? now() : null,
                ]);

                $grandTotal    = 0;
                $discountTotal = 0;
                $promoService  = app(PromotionService::class);

                foreach ($cartItems as $item) {
                    $bundleId  = (int) ($item['bundle_id'] ?? 0);
                    $productId = (int) ($item['id'] ?? 0);
                    $qtyBuy    = (int) ($item['qty'] ?? 0);

                    if ($bundleId > 0) {
                        // ===== PAKET / BUNDLE =====
                        $bundle = $promoService->resolveBundle($bundleId);
                        if (!$bundle) {
                            throw new \Exception('Paket promo tidak ditemukan atau sudah nonaktif.');
                        }
                        if ($qtyBuy <= 0) {
                            throw new \Exception('Jumlah pembelian paket tidak valid.');
                        }

                        $components = [];
                        $listTotal  = 0;
                        foreach ((array) $bundle->items as $row) {
                            $cid  = (int) ($row['product_id'] ?? 0);
                            $cqty = max(1, (int) ($row['qty'] ?? 1)) * $qtyBuy;

                            $prod = Product::where('id', $cid)->lockForUpdate()->first();
                            if (!$prod) {
                                throw new \Exception("Komponen paket (ID $cid) tidak ditemukan.");
                            }
                            if ($prod->stock < $cqty) {
                                throw new \Exception("Stok '" . $prod->name . "' tidak mencukupi untuk paket ini. Sisa stok: " . $prod->stock);
                            }

                            $components[] = ['prod' => $prod, 'qty' => $cqty];
                            $listTotal   += (int) $prod->price * $cqty;
                        }

                        $bundlePrice = (int) $bundle->bundle_price * $qtyBuy;

                        foreach ($components as $comp) {
                            $comp['prod']->decrement('stock', $comp['qty']);

                            OrderItem::create([
                                'order_id'   => $order->id,
                                'product_id' => $comp['prod']->id,
                                'qty'        => $comp['qty'],
                                'price'      => (int) $comp['prod']->price,
                                'total'      => (int) $comp['prod']->price * $comp['qty'],
                            ]);
                        }

                        $grandTotal    += $bundlePrice;
                        $discountTotal += max(0, $listTotal - $bundlePrice);
                        continue;
                    }

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

                    // Harga otentik dari DB + promo aktif (block/b1g1/persen produk).
                    $promoId = isset($item['promo_id']) ? (int) $item['promo_id'] : null;
                    $deal    = $promoService->resolveDeal($promoId, $productId);
                    $price   = $promoService->pricing($product, $qtyBuy, $deal);

                    $product->decrement('stock', $qtyBuy);

                    OrderItem::create([
                        'order_id'   => $order->id,
                        'product_id' => $productId,
                        'qty'        => $qtyBuy,
                        'price'      => $price['unit'],
                        'total'      => $price['total'],
                    ]);

                    $grandTotal    += $price['total'];
                    $discountTotal += $price['discount'];
                }

                // Tukar poin member menjadi potongan harga (server-side validated).
                $pointsUsed    = max(0, (int) ($data['points_used'] ?? 0));
                $pointsDiscount = 0;

                if ($pointsUsed > 0 && $user) {
                    $loyalty       = app(LoyaltyService::class);
                    $pointsUsed    = min($pointsUsed, (int) $user->points);
                    if ($pointsUsed > 0) {
                        $pointsDiscount = min($loyalty->discountFrom($pointsUsed), $grandTotal + $shippingFee);
                        $user->decrement('points', $pointsUsed);

                        \App\Models\UserPoint::create([
                            'user_id'     => $user->id,
                            'order_id'    => $order->id,
                            'amount'      => -$pointsUsed,
                            'type'        => 'redeem',
                            'description' => 'Tukar poin untuk pesanan #' . $order->id,
                            'created_at'  => now(),
                        ]);
                    }
                }

                $order->update([
                    'total_price'     => max(0, (int) round($grandTotal + $shippingFee - $pointsDiscount)),
                    'discount'        => $discountTotal,
                    'points_used'     => $pointsUsed,
                    'points_discount' => $pointsDiscount,
                ]);

                return $order;
            });

            // Kirim notifikasi (email) — kegagalan email tidak boleh menggagalkan pesanan.
            try {
                app(StoreNotifier::class)->orderCreated($order);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Gagal mengirim notifikasi pesanan: ' . $e->getMessage());
            }

            // Pebayaran tunai: langsung lunas -> berikan poin member.
            if ($isWalkIn) {
                app(LoyaltyService::class)->awardForOrder($order);
            }

            return response()->json([
                'status'       => 'success',
                'message'      => $isWalkIn ? 'Pembayaran tunai selesai. Stok telah dikunci.' : 'Checkout berhasil! Stok telah diamankan.',
                'order_id'     => $order->id,
                'total_price'  => (int) $order->total_price,
                'discount'     => (int) $order->discount,
                'points_used'  => (int) $order->points_used,
                'points_discount' => (int) $order->points_discount,
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

        $shippingFee = (int) $order->shipping_fee;
        if ($shippingFee <= 0 && $order->courier !== 'walkin') {
            $shippingFee = $order->courier === 'express' ? 20000 : 10000;
        }
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

        // Grup metode (qris/ewallet/transfer/snap) -> batasi metode yang tampil di Snap.
        $methodGroup = strtolower(trim((string) $request->input('group', 'snap')));
        $enabled = PaymentMethods::codes($methodGroup);

        $snapPayload = [
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
        ];

        // Batasi ke grup metode yang dipilih customer di checkout.
        if ($enabled !== null) {
            $snapPayload['enabled_payments'] = $enabled;
        }

        $result = $midtrans->createSnapTransaction($snapPayload);

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

    /**
     * Charge QRIS via Core API -> QR tampil langsung di aplikasi (ala Alfagift).
     * Grup lain diarahkan memakai Snap (response 'use_snap').
     */
    public function charge(Request $request, MidtransService $midtrans)
    {
        $user    = $request->user();
        $orderId = (int) ($request->input('order_id') ?? 0);
        $group   = strtolower(trim((string) $request->input('group', 'qris')));

        if ($orderId <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'ID order tidak valid.',
            ], 422);
        }

        if ($group !== 'qris') {
            // E-wallet / transfer tetap lewat Snap dengan metode terbatas.
            return response()->json([
                'status' => 'use_snap',
                'method' => $group,
            ]);
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

        if (!$midtrans->configured()) {
            return response()->json([
                'status'  => 'disabled',
                'message' => 'Pembayaran online belum dikonfigurasi.',
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

        $shippingFee = (int) $order->shipping_fee;
        if ($shippingFee <= 0 && $order->courier !== 'walkin') {
            $shippingFee = $order->courier === 'express' ? 20000 : 10000;
        }
        if ($shippingFee > 0) {
            $items[] = [
                'id'       => 'SHIPPING',
                'price'    => $shippingFee,
                'quantity' => 1,
                'name'     => 'Ongkos Kirim',
            ];
        }

        $midtransOrderId = config('midtrans.order_prefix') . '-QR-' . $order->id;

        $result = $midtrans->charge([
            'payment_type' => 'qris',
            'transaction_details' => [
                'order_id'     => $midtransOrderId,
                'gross_amount' => (int) $order->total_price,
            ],
            'item_details'     => $items,
            'customer_details' => [
                'first_name' => mb_substr($order->customer_name, 0, 49),
                'phone'      => $order->phone,
            ],
            // Acquirer umum di Indonesia supaya bisa di-scan semua aplikasi QRIS.
            'qris'   => ['acquirer' => 'gopay'],
            'expiry' => ['unit' => 'minutes', 'duration' => 15],
        ]);

        if ($result === null || empty($result['qr_string'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat QRIS: ' . ($result['error_messages'][0] ?? 'Tidak dapat terhubung ke Midtrans.'),
            ], 502);
        }

        $order->update([
            'midtrans_order_id' => $midtransOrderId,
            'qr_string'         => $result['qr_string'],
            'payment_method'    => 'qris',
            'payment_type'      => 'qris',
        ]);

        return response()->json([
            'status'        => 'success',
            'type'          => 'qris',
            'order_id'      => (int) $order->id,
            'total_price'   => (int) $order->total_price,
            'qr_string'     => $result['qr_string'],
            'qr_url'        => $result['qr_url'] ?? null,
            'expiry_minutes'=> 15,
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

            try {
                app(StoreNotifier::class)->orderPaid($order);
                app(LoyaltyService::class)->awardForOrder($order);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Gagal kirim notifikasi pembayaran: ' . $e->getMessage());
            }
        } elseif (!$paid && in_array($status['transaction_status'] ?? '', ['expire', 'cancel', 'deny'], true) && $order->payment_status !== 'paid') {
            $order->update(['payment_status' => $status['transaction_status']]);
            // Stok yang tadi dikunci dikembalikan agar produk bisa dijual lagi.
            $order->releaseItemsStock();
            // Poin tukar yang dipakai dikembalikan ke member.
            app(LoyaltyService::class)->refundForOrder($order);
        }

        return response()->json([
            'status'              => 'success',
            'payment_status'      => $order->payment_status,
            'transaction_status'  => $status['transaction_status'] ?? null,
            'paid'                => $paid,
        ]);
    }
}
