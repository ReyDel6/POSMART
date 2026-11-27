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
            if (!Schema::hasColumn('orders', 'pickup_at')) {
                $table->timestamp('pickup_at')->nullable()->after('paid_at');
            }
            if (!Schema::hasColumn('orders', 'pickup_deadline')) {
                $table->timestamp('pickup_deadline')->nullable()->after('pickup_at');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('orders', 'pickup_at')) $columns[] = 'pickup_at';
            if (Schema::hasColumn('orders', 'pickup_deadline')) $columns[] = 'pickup_deadline';
            if ($columns) $table->dropColumn($columns);
        });
    }
};
