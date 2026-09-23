<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('shipping_zones')) {
            return;
        }

        Schema::create('shipping_zones', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            $table->integer('fee')->default(0);
            $table->boolean('is_active')->default(true);
            $table->integer('sort')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        // Default zona pengiriman untuk toko kecil (bisa diubah/atur di panel admin).
        DB::table('shipping_zones')->insert([
            ['name' => 'Dalam Kota', 'fee' => 10000, 'is_active' => 1, 'sort' => 1],
            ['name' => 'Luar Kota', 'fee' => 20000, 'is_active' => 1, 'sort' => 2],
            ['name' => 'Luar Pulau / Jauh', 'fee' => 35000, 'is_active' => 1, 'sort' => 3],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_zones');
    }
};