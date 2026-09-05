<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            return;
        }

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('barcode', 20)->unique();
            $table->string('name', 150);
            $table->integer('price');
            $table->string('category', 50);
            $table->decimal('rating', 2, 1)->default(0.0);
            $table->integer('stock')->default(0);
            $table->boolean('is_promo')->default(false);
            $table->integer('promo')->default(0);
            $table->string('image', 255)->default('placeholder.jpg');
            $table->timestamp('created_at')->useCurrent();

            $table->index('price', 'idx_price');
            $table->index('is_promo', 'idx_promo');
            $table->index(['category', 'price', 'is_promo'], 'idx_catalog_filter');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
