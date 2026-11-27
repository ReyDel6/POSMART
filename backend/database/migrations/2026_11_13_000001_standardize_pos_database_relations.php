<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tambah category_id pada tabel products & hubungkan ke categories
        if (Schema::hasTable('products') && Schema::hasTable('categories')) {
            if (!Schema::hasColumn('products', 'category_id')) {
                Schema::table('products', function (Blueprint $table) {
                    $table->unsignedBigInteger('category_id')->nullable()->after('category');
                });
            }

            // Backfill category_id berdasarkan nama category yang ada
            $categories = DB::table('categories')->get()->keyBy('name');
            foreach ($categories as $name => $cat) {
                DB::table('products')
                    ->where('category', $name)
                    ->whereNull('category_id')
                    ->update(['category_id' => $cat->id]);
            }

            // Tambahkan Foreign Key constraint jika belum ada
            Schema::table('products', function (Blueprint $table) {
                $table->foreign('category_id', 'products_category_id_foreign')
                    ->references('id')
                    ->on('categories')
                    ->nullOnDelete();
                $table->index('category_id', 'idx_category_id');
            });
        }

        // 2. Hubungkan orders.user_id ke users.id secara relasional (Foreign Key)
        if (Schema::hasTable('orders') && Schema::hasTable('users')) {
            $hasUserFk = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', DB::raw('DATABASE()'))
                ->where('TABLE_NAME', 'orders')
                ->where('COLUMN_NAME', 'user_id')
                ->whereNotNull('REFERENCED_TABLE_NAME')
                ->exists();

            if (!$hasUserFk) {
                Schema::table('orders', function (Blueprint $table) {
                    $table->foreign('user_id', 'orders_user_id_foreign')
                        ->references('id')
                        ->on('users')
                        ->cascadeOnDelete();
                });
            }
        }

        // 3. Hubungkan order_items.product_id ke products.id secara relasional (Foreign Key)
        if (Schema::hasTable('order_items') && Schema::hasTable('products')) {
            $hasProductFk = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', DB::raw('DATABASE()'))
                ->where('TABLE_NAME', 'order_items')
                ->where('COLUMN_NAME', 'product_id')
                ->whereNotNull('REFERENCED_TABLE_NAME')
                ->exists();

            if (!$hasProductFk) {
                Schema::table('order_items', function (Blueprint $table) {
                    $table->foreign('product_id', 'order_items_product_id_foreign')
                        ->references('id')
                        ->on('products')
                        ->cascadeOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropForeign('order_items_product_id_foreign');
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign('orders_user_id_foreign');
            });
        }

        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropForeign('products_category_id_foreign');
                $table->dropIndex('idx_category_id');
                $table->dropColumn('category_id');
            });
        }
    }
};

