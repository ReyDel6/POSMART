<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use App\Models\UserPoint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Program poin/koin pelanggan (ala Alfagift):
 *   - Earn: saat pesanan lunas, poin = intdiv(record belanja, 1000) * rate.
 *   - Redeem: tukar poin jadi potongan harga di checkout (1 poin = RpX).
 * Poin dipotong saat checkout (anti ganda), dikembalikan bila pesanan batal/kadaluarsa.
 */
class LoyaltyService
{
    private function setting(string $key, $default = null)
    {
        return Setting::where('key', $key)->value('value') ?? $default;
    }

    public function earningRate(): int
    {
        return max(0, (int) $this->setting('point_earning_rate', 1));
    }

    public function redeemRate(): int
    {
        return max(0, (int) $this->setting('point_redeem_rate', 50));
    }

    /** Potongan maksimal (Rp) yang bisa didapat dari sejumlah poin. */
    public function discountFrom(int $points): int
    {
        return max(0, $points) * $this->redeemRate();
    }

    /**
     * Award poin saat pesanan lunas. Aman dipanggil berkali-kali (idempoten).
     */
    public function awardForOrder(Order $order): void
    {
        try {
            if (!$order->user_id || $order->payment_status !== 'paid') {
                return;
            }

            if (UserPoint::where('order_id', $order->id)->where('type', 'earn')->exists()) {
                return;
            }

            $spend  = max(0, (int) $order->total_price - (int) $order->points_discount);
            $points = intdiv($spend, 1000) * $this->earningRate();

            if ($points <= 0) {
                return;
            }

            DB::transaction(function () use ($order, $points) {
                User::where('id', $order->user_id)->increment('points', $points);

                UserPoint::create([
                    'user_id'     => $order->user_id,
                    'order_id'    => $order->id,
                    'amount'      => $points,
                    'type'        => 'earn',
                    'description' => 'Poin dari pesanan #' . $order->id,
                    'created_at'  => now(),
                ]);
            });
        } catch (\Throwable $e) {
            Log::warning('[poin] Gagal menambah poin pesanan #' . $order->id . ': ' . $e->getMessage());
        }
    }

    /**
     * Batalkan efek poin pada pesanan (batal/kadaluarsa):
     * kembalikan poin yang dipakai tukar & tarik kembali poin yang sempat didapat.
     */
    public function refundForOrder(Order $order): void
    {
        try {
            if (!$order->user_id) {
                return;
            }

            DB::transaction(function () use ($order) {
                $redeemed = (int) UserPoint::where('order_id', $order->id)->where('type', 'redeem')->sum('amount');
                if ($redeemed < 0) {
                    User::where('id', $order->user_id)->increment('points', -$redeemed);
                }
                UserPoint::where('order_id', $order->id)->where('type', 'redeem')->delete();

                $earned = (int) UserPoint::where('order_id', $order->id)->where('type', 'earn')->sum('amount');
                if ($earned > 0) {
                    User::where('id', $order->user_id)->decrement('points', $earned);
                }
                UserPoint::where('order_id', $order->id)->where('type', 'earn')->delete();
            });
        } catch (\Throwable $e) {
            Log::warning('[poin] Gagal mengembalikan poin pesanan #' . $order->id . ': ' . $e->getMessage());
        }
    }
}