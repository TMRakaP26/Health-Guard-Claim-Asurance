<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('client')->change();
            $table->boolean('is_active')->default(true)->index();
            $table->text('two_factor_secret')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->json('two_factor_recovery_codes')->nullable();
            $table->unsignedBigInteger('two_factor_last_counter')->nullable();
            $table->string('locale', 5)->default('id');
        });
        Schema::create('claim_drafts', function (Blueprint $table) {
            $table->id(); $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('data'); $table->timestamps();
        });
        Schema::create('claim_messages', function (Blueprint $table) {
            $table->id(); $table->foreignId('claim_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body'); $table->timestamps(); $table->index(['claim_id', 'id']);
        });
        Schema::create('claim_document_requests', function (Blueprint $table) {
            $table->id(); $table->foreignId('claim_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title'); $table->text('instructions');
            $table->string('status', 20)->default('open'); $table->timestamp('fulfilled_at')->nullable(); $table->timestamps();
        });
        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('request_id')->nullable()->constrained('claim_document_requests')->nullOnDelete();
            $table->foreignId('message_id')->nullable()->constrained('claim_messages')->nullOnDelete();
        });
        Schema::create('claim_payments', function (Blueprint $table) {
            $table->id(); $table->foreignId('claim_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('amount', 10, 2); $table->string('status', 20);
            $table->string('reference', 100); $table->timestamp('paid_at'); $table->timestamp('settled_at')->nullable();
            $table->timestamps();
        });
        Schema::create('providers', function (Blueprint $table) {
            $table->id(); $table->string('name'); $table->string('code', 30)->unique();
            $table->text('address')->nullable(); $table->boolean('is_active')->default(true); $table->timestamps();
        });
        Schema::create('claim_categories', function (Blueprint $table) {
            $table->id(); $table->string('name'); $table->string('code', 30)->unique();
            $table->string('diagnosis_code', 30)->nullable(); $table->text('coverage_rules')->nullable();
            $table->decimal('coverage_limit', 10, 2)->nullable(); $table->boolean('is_active')->default(true); $table->timestamps();
        });
        Schema::create('analyst_invitations', function (Blueprint $table) {
            $table->id(); $table->string('email'); $table->string('token_hash', 64)->unique();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at'); $table->timestamp('accepted_at')->nullable(); $table->timestamps();
        });
        Schema::create('deletion_requests', function (Blueprint $table) {
            $table->id(); $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('pending'); $table->text('reason')->nullable();
            $table->text('review_notes')->nullable(); $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('deletion_requests'); Schema::dropIfExists('analyst_invitations');
        Schema::dropIfExists('claim_categories'); Schema::dropIfExists('providers'); Schema::dropIfExists('claim_payments');
        Schema::table('documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('request_id'); $table->dropConstrainedForeignId('message_id');
        });
        Schema::dropIfExists('claim_document_requests'); Schema::dropIfExists('claim_messages'); Schema::dropIfExists('claim_drafts');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_active', 'two_factor_secret', 'two_factor_confirmed_at', 'two_factor_recovery_codes', 'two_factor_last_counter', 'locale']);
        });
    }
};
