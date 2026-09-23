<?php

namespace App\Services;

use App\Http\Controllers\Admin\AdminSettingController;
use App\Mail\NewOrderForStoreMail;
use App\Mail\OrderConfirmMail;
use App\Mail\OrderPaidMail;
use App\Mail\PasswordResetMail;
use App\Models\Order;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class StoreNotifier
{
    private function settings(): array
    {
        return Setting::whereIn('key', AdminSettingController::KEYS)
            ->pluck('value', 'key')
            ->all();
    }

    private function items(Order $order): array
    {
        $order->loadMissing('items.product');

        return $order->items->map(fn ($i) => [
            'name'  => $i->product?->name ?? ('Produk #' . $i->product_id),
            'qty'   => (int) $i->qty,
            'total' => (int) $i->total,
        ])->all();
    }

    public function orderCreated(Order $order): void
    {
        $store  = $this->settings();
        $items  = $this->items($order);
        $walkIn = $order->payment_mode === 'cash';

        try {
            if ($order->user && $order->user->email) {
                Mail::to($order->user->email)->send(new OrderConfirmMail($order, $store, $items, $walkIn));
            }
        } catch (\Throwable $e) {
            Log::warning('[notifikasi] Gagal kirim konfirmasi ke pelanggan: ' . $e->getMessage());
        }

        $storeEmail = trim((string) ($store['store_email'] ?? ''));
        if ($storeEmail !== '') {
            try {
                Mail::to($storeEmail)->send(new NewOrderForStoreMail($order, $store, $items, $walkIn));
            } catch (\Throwable $e) {
                Log::warning('[notifikasi] Gagal kirim notifikasi pesanan baru ke toko: ' . $e->getMessage());
            }
        }
    }

    public function orderPaid(Order $order): void
    {
        $store = $this->settings();

        try {
            if ($order->user && $order->user->email) {
                Mail::to($order->user->email)->send(new OrderPaidMail($order, $store));
            }
        } catch (\Throwable $e) {
            Log::warning('[notifikasi] Gagal kirim email pembayaran diterima: ' . $e->getMessage());
        }
    }

    public function sendResetLink(string $email, string $token): void
    {
        $store = $this->settings();
        $base  = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $url   = $base . '/reset-password?token=' . urlencode($token) . '&email=' . urlencode($email);

        try {
            Mail::to($email)->send(new PasswordResetMail(
                $store['store_name'] ?? 'POSMart',
                $url,
                $token
            ));
        } catch (\Throwable $e) {
            Log::warning('[notifikasi] Gagal kirim email reset password: ' . $e->getMessage());
        }
    }
}