<?php

namespace App\Services;

use App\Models\Setting;

/**
 * Pemetaan grup metode pembayaran online (ala Alfagift) ke kode Midtrans Snap.
 *   - qris     : QRIS (QR tampil di aplikasi via Core API charge)
 *   - ewallet  : GoPay, ShopeePay, OVO, DANA
 *   - transfer : Transfer Bank / Virtual Account
 *   - snap     : semua metode Snap
 * Kode bisa dibatasi lewat setting 'payment_methods' (comma-separated).
 */
class PaymentMethods
{
    public static function codes(string $group): ?array
    {
        $map = [
            'qris'     => ['qris'],
            'ewallet'  => ['gopay', 'shopeepay', 'ovo', 'dana'],
            'transfer' => ['bank_transfer', 'echannel', 'bca_va', 'bni_va', 'bri_va', 'permata_va', 'other_va'],
            'snap'     => null,
        ];

        return $map[$group] ?? null;
    }

    public static function enabled(): array
    {
        $raw = (string) (Setting::where('key', 'payment_methods')->value('value') ?? '');
        if (trim($raw) === '') {
            return ['qris', 'ewallet', 'transfer', 'snap'];
        }
        $list = array_filter(array_map('strtolower', array_map('trim', explode(',', $raw))));

        return $list;
    }
}