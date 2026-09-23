<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL: enum perlu diregenerasi agar menerima role 'owner'.
        // SQLite (testing) tidak mengenal enum, jadi dilewati.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user','cashier','admin','owner') NOT NULL DEFAULT 'user'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('user','cashier','admin') NOT NULL DEFAULT 'user'");
        }
    }
};