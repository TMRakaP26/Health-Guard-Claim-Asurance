<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claim_sequences', function (Blueprint $table) {
            $table->unsignedInteger('year')->primary();
            $table->unsignedBigInteger('value')->default(0);
        });
        Schema::create('claim_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 50);
            $table->string('from_status', 50)->nullable();
            $table->string('to_status', 50)->nullable();
            $table->text('notes')->nullable();
            $table->decimal('approved_amount', 10, 2)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['claim_id', 'created_at']);
            $table->index('event');
        });
        Schema::table('claims', function (Blueprint $table) {
            $table->date('patient_date_of_birth')->nullable();
            $table->date('service_date')->nullable();
            $table->index(['user_id', 'date_submitted']);
            $table->index(['assigned_to', 'status']);
            $table->index(['status', 'date_submitted']);
        });
        Schema::table('notifications', fn (Blueprint $table) => $table->index(['user_id', 'is_read']));
    }

    public function down(): void
    {
        Schema::table('notifications', fn (Blueprint $table) => $table->dropIndex(['user_id', 'is_read']));
        Schema::table('claims', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'date_submitted']);
            $table->dropIndex(['assigned_to', 'status']);
            $table->dropIndex(['status', 'date_submitted']);
            $table->dropColumn(['patient_date_of_birth', 'service_date']);
        });
        Schema::dropIfExists('claim_histories');
        Schema::dropIfExists('claim_sequences');
    }
};
