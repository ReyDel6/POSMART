<?php

use App\Http\Controllers\Admin\AdminCategoryController;
use App\Http\Controllers\Admin\AdminOrderController;
use App\Http\Controllers\Admin\AdminProductController;
use App\Http\Controllers\Admin\AdminReportsController;
use App\Http\Controllers\Admin\AdminSettingController;
use App\Http\Controllers\Admin\AdminStatsController;
use App\Http\Controllers\Admin\AdminUploadController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MidtransWebhookController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\UserOrderController;
use Illuminate\Support\Facades\Route;

// =========================================================================
// PUBLIC ROUTES
// =========================================================================

// Catalog & categories
Route::get('/get.product.php', [ProductController::class, 'index']);

// Ulasan produk (publik baca)
Route::get('/product_reviews.php', [ReviewController::class, 'show']);

// Authentication
Route::post('/user/register.php', [AuthController::class, 'register']);
Route::post('/user/login.php', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/user/googleauth.php', [AuthController::class, 'googleAuth']);

// Lupa / reset password
Route::post('/user/forgot-password.php', [PasswordResetController::class, 'forgot'])->middleware('throttle:login');
Route::post('/user/reset-password.php', [PasswordResetController::class, 'reset'])->middleware('throttle:login');

// Informasi toko publik (dipakai struk, invoice, notifikasi WA)
Route::get('/public/settings.php', [SettingController::class, 'publicIndex']);

// Webhook pembayaran Midtrans (dipanggil server Midtrans, tanpa token)
Route::post('/midtrans/webhook.php', [MidtransWebhookController::class, 'handle']);

// =========================================================================
// AUTHENTICATED ROUTES (Sanctum token)
// =========================================================================
Route::middleware('auth:sanctum')->group(function () {
    // Checkout / Create Order
    Route::post('/cart/create_order.php', [OrderController::class, 'create']);

    // Midtrans: buat transaksi Snap & cek status pembayaran
    Route::post('/cart/midtrans_snap.php', [OrderController::class, 'snap']);
    Route::post('/cart/midtrans_check_status.php', [OrderController::class, 'checkPaymentStatus']);

    // Pesanan saya
    Route::get('/orders.php', [UserOrderController::class, 'index']);
    Route::get('/orders/detail.php', [UserOrderController::class, 'show']);

    // Nilai & ulas produk
    Route::post('/product/review.php', [ReviewController::class, 'store']);
});

// =========================================================================
// ADMIN/OWNER ROUTES (panel: ringkasan, transaksi, laporan)
// =========================================================================
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    // Orders
    Route::get('/admin/orders.php', [AdminOrderController::class, 'index']);
    Route::put('/admin/orders.php', [AdminOrderController::class, 'update']);

    // Stats / Dashboard
    Route::get('/admin/stats.php', [AdminStatsController::class, 'index']);

    // Reports per periode (hari/minggu/bulan/tahun) + export CSV
    Route::get('/admin/reports.php', [AdminReportsController::class, 'index']);
    Route::get('/admin/reports/export.php', [AdminReportsController::class, 'export']);
});

// =========================================================================
// MANAGER ROUTES (khusus Admin: produk, kategori, staf, pengaturan)
// =========================================================================
Route::middleware(['auth:sanctum', 'manager'])->group(function () {
    // Products CRUD
    Route::get('/admin/products.php', [AdminProductController::class, 'index']);
    Route::post('/admin/products.php', [AdminProductController::class, 'store']);
    Route::put('/admin/products.php', [AdminProductController::class, 'update']);
    Route::delete('/admin/products.php', [AdminProductController::class, 'destroy']);

    // Upload product image
    Route::post('/admin/upload_product_image.php', [AdminUploadController::class, 'store']);

    // Users & Staff management
    Route::get('/admin/users.php', [AdminUserController::class, 'index']);
    Route::post('/admin/users.php', [AdminUserController::class, 'store']);
    Route::put('/admin/users.php', [AdminUserController::class, 'update']);
    Route::delete('/admin/users.php', [AdminUserController::class, 'destroy']);

    // Categories
    Route::get('/admin/categories.php', [AdminCategoryController::class, 'index']);

    // Store settings
    Route::get('/admin/settings.php', [AdminSettingController::class, 'index']);
    Route::put('/admin/settings.php', [AdminSettingController::class, 'update']);
});