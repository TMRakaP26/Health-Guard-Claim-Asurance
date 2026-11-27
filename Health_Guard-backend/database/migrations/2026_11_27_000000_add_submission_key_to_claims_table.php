<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            // Nullable so pre-existing claims and clients that send no key keep working.
            $table->string('submission_key', 64)->nullable()->after('claim_id');
            $table->unique(['user_id', 'submission_key']);
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'submission_key']);
            $table->dropColumn('submission_key');
        });
    }
};
