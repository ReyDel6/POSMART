<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\MidtransService;
use Illuminate\Http\Request;

class MidtransWebhookController extends Controller
{
    public function handle(Request $request, MidtransService $midtrans)
    {
        $payload = $request->json()->all();
        if (empty($payload)) {
            $payload = $request->all();
        }

        $orderId     = (string) ($payload['order_id'] ?? '');
        $statusCode  = (string) ($payload['status_code'] ?? '');
        $grossAmount = (string) ($payload['gross_amount'] ?? '');
        $signature   = (string) ($payload['signature_key'] ?? '');

        if ($orderId === '' || $signature === '' || !$midtrans->verifySignature($orderId, $statusCode, $grossAmount, $signature)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Signature tidak valid.',
            ], 403);
        }

        $order = Order::where('midtrans_order_id', $orderId)->first();
        if (!$order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Order tidak ditemukan.',
            ], 404);
        }

        $transactionStatus = $payload['transaction_status'] ?? null;
        $fraudStatus       = $payload['fraud_status'] ?? null;
        $statusProxy       = [
            'transaction_status' => $transactionStatus,
            'fraud_status'       => $fraudStatus,
        ];
        $paid = $midtrans->isPaid($statusProxy);

        if ($paid && $order->payment_status !== 'paid') {
            $order->update([
                'payment_status' => 'paid',
                'payment_method' => $payload['payment_type'] ?? $payload['payment_method'] ?? null,
                'payment_type'   => $payload['payment_type'] ?? null,
                'paid_at'        => now(),
            ]);

            if ($order->status === 'pending') {
                $order->update(['status' => 'paid']);
            }

            try {
                app(\App\Services\StoreNotifier::class)->orderPaid($order);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Gagal kirim notifikasi pembayaran: ' . $e->getMessage());
            }
        } elseif (!$paid && in_array($transactionStatus, ['expire', 'cancel', 'deny'], true) && $order->payment_status !== 'paid') {
            $order->update(['payment_status' => $transactionStatus]);
            // Stok yang tadi dikunci dikembalikan agar produk bisa dijual lagi.
            $order->releaseItemsStock();
        }

        return response()->json(['status' => 'success']);
    }
}