<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->unsignedInteger('usage_limit')->nullable()->after('active');
            $table->unsignedInteger('used_count')->default(0)->after('usage_limit');
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn(['usage_limit', 'used_count']);
        });
    }
};
