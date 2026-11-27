<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Admin\AdminSettingController;
use App\Models\Setting;
use App\Models\ShippingZone;

class SettingController extends Controller
{
    public function publicIndex()
    {
        $settings = Setting::whereIn('key', AdminSettingController::KEYS)->pluck('value', 'key');

        return response()->json([
            'status' => 'success',
            'data'   => $settings,
        ]);
    }

    public function publicZones()
    {
        $zones = ShippingZone::where('is_active', true)
            ->orderBy('sort', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($z) {
                return [
                    'id'   => (int) $z->id,
                    'name' => $z->name,
                    'coverage' => $z->coverage,
                    'fee'  => (int) $z->fee,
                    'free_shipping_minimum' => $z->free_shipping_minimum !== null ? (int) $z->free_shipping_minimum : null,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $zones,
        ]);
    }
}