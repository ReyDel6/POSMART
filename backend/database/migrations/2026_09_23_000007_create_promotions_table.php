<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            // block  = diskon blok berjenjang (tiers), b1g1 = beli X gratis Y, bundle = paket gabungan produk
            $table->string('type', 20)->default('block');
            $table->unsignedInteger('product_id')->nullable();
            $table->json('tiers')->nullable();
            $table->unsignedInteger('buy_qty')->nullable();
            $table->unsignedInteger('free_qty')->nullable();
            $table->json('items')->nullable();
            $table->unsignedInteger('bundle_price')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['active', 'type']);
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};