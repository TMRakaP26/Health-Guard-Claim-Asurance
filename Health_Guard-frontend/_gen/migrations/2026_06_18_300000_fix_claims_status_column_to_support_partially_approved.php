<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Change status column to VARCHAR to support all status values including 'Partially Approved'
        DB::statement("ALTER TABLE claims MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Pending'");
    }

    public function down(): void
    {
        // Revert to ENUM without Partially Approved
        DB::statement("ALTER TABLE claims MODIFY COLUMN status ENUM('Pending','Approved','Rejected','Needs Info') NOT NULL DEFAULT 'Pending'");
    }
};
