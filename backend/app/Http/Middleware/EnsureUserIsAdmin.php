<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, ['admin', 'owner'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akses ditolak. Hanya untuk Admin/Owner.',
            ], 403);
        }

        return $next($request);
    }
}