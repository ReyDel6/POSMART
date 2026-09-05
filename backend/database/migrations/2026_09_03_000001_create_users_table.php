<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            return;
        }

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('google_id', 255)->nullable();
            $table->string('name', 150);
            $table->string('email', 100)->unique();
            $table->string('password', 255)->nullable();
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->enum('role', ['user', 'admin', 'cashier'])->default('user');
            $table->timestamp('created_at')->useCurrent();

            $table->index('email', 'idx_email');
            $table->index('google_id', 'idx_google');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
