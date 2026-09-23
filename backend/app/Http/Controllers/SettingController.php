<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Admin\AdminSettingController;
use App\Models\Setting;

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
}