<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Throttle login: maksimal 6 percobaan per menit per IP/akun.
        RateLimiter::for('login', function (Request $request) {
            $key = optional($request->user())->id ?: $request->ip();

            return Limit::perMinute(6)->by($key);
        });
    }
}