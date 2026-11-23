<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            // Existing `type` values are service categories, not diagnoses. Keep
            // them intact and add a dedicated disease/description field.
            $table->string('disease_name')->nullable()->after('type');
            $table->text('description')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->dropColumn(['disease_name', 'description']);
        });
    }
};
