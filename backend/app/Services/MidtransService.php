<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MidtransService
{
    public function configured(): bool
    {
        return config('midtrans.server_key') !== '' && config('midtrans.client_key') !== '';
    }

    public function clientKey(): string
    {
        return (string) config('midtrans.client_key');
    }

    public function snapJsUrl(): string
    {
        return (string) config('midtrans.snap_js_url');
    }

    private function snapApiUrl(): string
    {
        return (string) config('midtrans.snap_api_url');
    }

    private function transactionApiUrl(): string
    {
        return (string) config('midtrans.transaction_api_url');
    }

    public function createSnapTransaction(array $payload): ?array
    {
        try {
            $response = Http::withBasicAuth(config('midtrans.server_key'), '')
                ->acceptJson()
                ->asJson()
                ->post($this->snapApiUrl() . 'transactions', $payload);

            return $response->json();
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function getTransactionStatus(string $midtransOrderId): ?array
    {
        try {
            $response = Http::withBasicAuth(config('midtrans.server_key'), '')
                ->acceptJson()
                ->get($this->transactionApiUrl() . 'v2/' . rawurlencode($midtransOrderId) . '/status');

            return $response->json();
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function isPaid(array $status): bool
    {
        $transactionStatus = $status['transaction_status'] ?? null;
        $fraudStatus = $status['fraud_status'] ?? null;

        return in_array($transactionStatus, ['capture', 'settlement'], true)
            && ($fraudStatus === null || $fraudStatus === 'accept');
    }

    public function verifySignature(string $orderId, string $statusCode, string $grossAmount, string $signature): bool
    {
        $expected = hash('sha512', $orderId . $statusCode . $grossAmount . config('midtrans.server_key'));

        return hash_equals($expected, $signature);
    }
}