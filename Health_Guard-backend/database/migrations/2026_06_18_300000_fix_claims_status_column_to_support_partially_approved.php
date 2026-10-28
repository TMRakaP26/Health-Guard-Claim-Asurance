<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL stores the status column as an ENUM that does not include
        // 'Partially Approved', so it must be converted to VARCHAR(50).
        // SQLite (the default database) stores it as a plain VARCHAR, so no
        // change is required there.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE claims MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE claims MODIFY COLUMN status ENUM('Pending','Approved','Rejected','Needs Info') NOT NULL DEFAULT 'Pending'");
        }
    }
};
