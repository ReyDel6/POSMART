<?php

use App\Http\Controllers\Admin\AdminOrderController;
use App\Http\Controllers\Admin\AdminProductController;
use App\Http\Controllers\Admin\AdminStatsController;
use App\Http\Controllers\Admin\AdminUploadController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

// =========================================================================
// PUBLIC ROUTES
// =========================================================================

// Catalog & categories
Route::get('/get.product.php', [ProductController::class, 'index']);

// Authentication
Route::post('/user/register.php', [AuthController::class, 'register']);
Route::post('/user/login.php', [AuthController::class, 'login']);
Route::post('/user/googleauth.php', [AuthController::class, 'googleAuth']);

// =========================================================================
// AUTHENTICATED ROUTES (Sanctum token)
// =========================================================================
Route::middleware('auth:sanctum')->group(function () {
    // Checkout / Create Order
    Route::post('/cart/create_order.php', [OrderController::class, 'create']);
});

// =========================================================================
// ADMIN ROUTES (Sanctum + role admin)
// =========================================================================
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    // Products CRUD
    Route::get('/admin/products.php', [AdminProductController::class, 'index']);
    Route::post('/admin/products.php', [AdminProductController::class, 'store']);
    Route::put('/admin/products.php', [AdminProductController::class, 'update']);
    Route::delete('/admin/products.php', [AdminProductController::class, 'destroy']);

    // Orders
    Route::get('/admin/orders.php', [AdminOrderController::class, 'index']);
    Route::put('/admin/orders.php', [AdminOrderController::class, 'update']);

    // Stats / Dashboard
    Route::get('/admin/stats.php', [AdminStatsController::class, 'index']);

    // Upload product image
    Route::post('/admin/upload_product_image.php', [AdminUploadController::class, 'store']);
});
