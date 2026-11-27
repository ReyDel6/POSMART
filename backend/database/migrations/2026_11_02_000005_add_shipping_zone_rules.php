<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_zones', function (Blueprint $table) {
            $table->string('coverage', 255)->nullable()->after('name');
            $table->unsignedInteger('free_shipping_minimum')->nullable()->after('fee');
        });
    }

    public function down(): void
    {
        Schema::table('shipping_zones', function (Blueprint $table) {
            $table->dropColumn(['coverage', 'free_shipping_minimum']);
        });
    }
};
