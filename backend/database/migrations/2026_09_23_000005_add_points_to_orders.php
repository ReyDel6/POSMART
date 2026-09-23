<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'points_used')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->integer('points_used')->default(0)->after('shipping_fee');
                $table->integer('points_discount')->default(0)->after('points_used');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn(['points_used', 'points_discount']);
            });
        }
    }
};