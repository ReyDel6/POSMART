<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'qr_string')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->text('qr_string')->nullable()->after('snap_redirect_url');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'qr_string')) {
                    $table->dropColumn('qr_string');
                }
            });
        }
    }
};