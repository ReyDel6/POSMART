<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'payment_mode')) {
                $table->string('payment_mode', 20)->default('online')->after('payment_status');
            }
            if (!Schema::hasColumn('orders', 'stock_released_at')) {
                $table->timestamp('stock_released_at')->nullable()->after('paid_at');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'payment_mode')) {
                    $table->dropColumn('payment_mode');
                }
                if (Schema::hasColumn('orders', 'stock_released_at')) {
                    $table->dropColumn('stock_released_at');
                }
            });
        }
    }
};