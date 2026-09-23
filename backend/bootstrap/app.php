<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin'   => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'manager' => \App\Http\Middleware\EnsureUserIsManager::class,
        ]);

        \Illuminate\Auth\Middleware\Authenticate::redirectUsing(fn ($request) => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => true);

        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            return response()->json([
                'status' => 'error',
                'message' => 'Token kedaluwarsa atau tidak sah. Silakan login kembali.',
            ], 401);
        });
    })->create();
