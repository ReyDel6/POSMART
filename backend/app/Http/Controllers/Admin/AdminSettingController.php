<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class AdminSettingController extends Controller
{
    public const KEYS = ['store_name', 'store_phone', 'store_address', 'receipt_footer', 'whatsapp', 'store_email', 'point_earning_rate', 'point_redeem_rate', 'payment_methods'];

    public function index()
    {
        $settings = Setting::whereIn('key', self::KEYS)->pluck('value', 'key');

        return response()->json([
            'status' => 'success',
            'data'   => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $data = array_intersect_key($request->all(), array_flip(self::KEYS));

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => trim((string) $value)]
            );
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Pengaturan toko berhasil disimpan.',
        ]);
    }
}