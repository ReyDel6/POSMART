<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('products')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'description')) {
                $table->text('description')->nullable()->after('image');
            }
            if (!Schema::hasColumn('products', 'gallery')) {
                $table->text('gallery')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (Schema::hasColumn('products', 'gallery')) {
                    $table->dropColumn('gallery');
                }
                if (Schema::hasColumn('products', 'description')) {
                    $table->dropColumn('description');
                }
            });
        }
    }
};