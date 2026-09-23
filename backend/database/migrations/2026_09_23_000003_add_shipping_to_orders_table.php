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
            if (!Schema::hasColumn('orders', 'shipping_zone_id')) {
                $table->unsignedBigInteger('shipping_zone_id')->nullable()->after('courier');
            }
            if (!Schema::hasColumn('orders', 'shipping_fee')) {
                $table->decimal('shipping_fee', 10, 2)->default(0)->after('shipping_zone_id');
            }
        });

        if (Schema::hasTable('orders') && Schema::hasTable('shipping_zones') && !Schema::hasColumn('orders', 'shipping_fk_dummy')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'shipping_fk_dummy')) {
                    $table->foreign('shipping_zone_id')->references('id')->on('shipping_zones')->onDelete('set null');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('shipping_zones') && !Schema::hasColumn('orders', 'shipping_fk_dummy')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['shipping_zone_id']);
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'shipping_fee')) {
                    $table->dropColumn('shipping_fee');
                }
                if (Schema::hasColumn('orders', 'shipping_zone_id')) {
                    $table->dropColumn('shipping_zone_id');
                }
            });
        }
    }
};