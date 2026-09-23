<?php

return [
    'server_key' => env('MIDTRANS_SERVER_KEY', ''),
    'client_key' => env('MIDTRANS_CLIENT_KEY', ''),

    // true = akun production (app.midtrans.com), false = sandbox (app.sandbox.midtrans.com)
    'is_production' => env('MIDTRANS_IS_PRODUCTION', false),

    // Prefix order_id di Midtrans. HARUS unik per aplikasi dalam 1 akun
    // (mis. UMKM Connect pakai "UMKM-...", POSMart pakai "POS-...").
    'order_prefix' => env('MIDTRANS_ORDER_PREFIX', 'POS'),

    'snap_js_url' => env('MIDTRANS_SNAP_JS_URL', env('MIDTRANS_IS_PRODUCTION', false)
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'),

    'snap_api_url' => env('MIDTRANS_SNAP_API_URL', env('MIDTRANS_IS_PRODUCTION', false)
        ? 'https://app.midtrans.com/snap/v1/'
        : 'https://app.sandbox.midtrans.com/snap/v1/'),

    'transaction_api_url' => env('MIDTRANS_TRANSACTION_API_URL', env('MIDTRANS_IS_PRODUCTION', false)
        ? 'https://api.midtrans.com/'
        : 'https://api.sandbox.midtrans.com/'),
];