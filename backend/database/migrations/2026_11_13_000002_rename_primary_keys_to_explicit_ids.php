<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. categories: id -> category_id
        if (Schema::hasColumn('categories', 'id') && !Schema::hasColumn('categories', 'category_id')) {
            $hasFk = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', DB::raw('DATABASE()'))
                ->where('TABLE_NAME', 'products')
                ->where('CONSTRAINT_NAME', 'products_category_id_foreign')
                ->exists();

            if ($hasFk) {
                Schema::table('products', function (Blueprint $table) {
                    $table->dropForeign('products_category_id_foreign');
                });
            }

            DB::statement('ALTER TABLE categories RENAME COLUMN id TO category_id');

            Schema::table('products', function (Blueprint $table) {
                $table->foreign('category_id', 'products_category_id_foreign')
                    ->references('category_id')
                    ->on('categories')
                    ->nullOnDelete();
            });
        }

        // 2. products: id -> product_id
        if (Schema::hasColumn('products', 'id') && !Schema::hasColumn('products', 'product_id')) {
            $hasFk = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', DB::raw('DATABASE()'))
                ->where('TABLE_NAME', 'order_items')
                ->where('CONSTRAINT_NAME', 'order_items_product_id_foreign')
                ->exists();

            if ($hasFk) {
                Schema::table('order_items', function (Blueprint $table) {
                    $table->dropForeign('order_items_product_id_foreign');
                });
            }

            DB::statement('ALTER TABLE products RENAME COLUMN id TO product_id');

            Schema::table('order_items', function (Blueprint $table) {
                $table->foreign('product_id', 'order_items_product_id_foreign')
                    ->references('product_id')
                    ->on('products')
                    ->cascadeOnDelete();
            });
        }

        // 3. orders: id -> order_id
        if (Schema::hasColumn('orders', 'id') && !Schema::hasColumn('orders', 'order_id')) {
            $hasFk = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', DB::raw('DATABASE()'))
                ->where('TABLE_NAME', 'order_items')
                ->whereIn('CONSTRAINT_NAME', ['order_items_ibfk_1', 'order_items_order_id_foreign'])
                ->exists();

            if ($hasFk) {
                Schema::table('order_items', function (Blueprint $table) {
                    try {
                        $table->dropForeign('order_items_ibfk_1');
                    } catch (\Throwable $e) {}
                    try {
                        $table->dropForeign('order_items_order_id_foreign');
                    } catch (\Throwable $e) {}
                });
            }

            DB::statement('ALTER TABLE orders RENAME COLUMN id TO order_id');

            Schema::table('order_items', function (Blueprint $table) {
                $table->foreign('order_id', 'order_items_order_id_foreign')
                    ->references('order_id')
                    ->on('orders')
                    ->cascadeOnDelete();
            });
        }

        // 4. users: id -> user_id
        if (Schema::hasColumn('users', 'id') && !Schema::hasColumn('users', 'user_id')) {
            $hasOrderFk = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', DB::raw('DATABASE()'))
                ->where('TABLE_NAME', 'orders')
                ->where('CONSTRAINT_NAME', 'orders_user_id_foreign')
                ->exists();

            if ($hasOrderFk) {
                Schema::table('orders', function (Blueprint $table) {
                    $table->dropForeign('orders_user_id_foreign');
                });
            }

            $hasPointsFk = DB::table('information_schema.KEY_COLUMN_USAGE')
                ->where('TABLE_SCHEMA', DB::raw('DATABASE()'))
                ->where('TABLE_NAME', 'user_points_ledger')
                ->where('CONSTRAINT_NAME', 'user_points_ledger_user_id_foreign')
                ->exists();

            if ($hasPointsFk) {
                Schema::table('user_points_ledger', function (Blueprint $table) {
                    $table->dropForeign('user_points_ledger_user_id_foreign');
                });
            }

            DB::statement('ALTER TABLE users RENAME COLUMN id TO user_id');

            Schema::table('orders', function (Blueprint $table) {
                $table->foreign('user_id', 'orders_user_id_foreign')
                    ->references('user_id')
                    ->on('users')
                    ->cascadeOnDelete();
            });

            Schema::table('user_points_ledger', function (Blueprint $table) {
                $table->foreign('user_id', 'user_points_ledger_user_id_foreign')
                    ->references('user_id')
                    ->on('users')
                    ->cascadeOnDelete();
            });
        }
    }

    public function down(): void
    {
        // Revert columns back to id if needed
    }
};

