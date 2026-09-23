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
            if (!Schema::hasColumn('orders', 'midtrans_order_id')) {
                $table->string('midtrans_order_id', 80)->nullable()->unique()->after('status');
            }
            if (!Schema::hasColumn('orders', 'snap_token')) {
                $table->string('snap_token', 255)->nullable()->after('midtrans_order_id');
            }
            if (!Schema::hasColumn('orders', 'snap_redirect_url')) {
                $table->string('snap_redirect_url', 255)->nullable()->after('snap_token');
            }
            if (!Schema::hasColumn('orders', 'payment_status')) {
                $table->string('payment_status', 30)->default('pending')->after('snap_redirect_url');
            }
            if (!Schema::hasColumn('orders', 'payment_method')) {
                $table->string('payment_method', 80)->nullable()->after('payment_status');
            }
            if (!Schema::hasColumn('orders', 'payment_type')) {
                $table->string('payment_type', 50)->nullable()->after('payment_method');
            }
            if (!Schema::hasColumn('orders', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('payment_type');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropUnique(['midtrans_order_id']);
                $table->dropColumn([
                    'midtrans_order_id',
                    'snap_token',
                    'snap_redirect_url',
                    'payment_status',
                    'payment_method',
                    'payment_type',
                    'paid_at',
                ]);
            });
        }
    }
};