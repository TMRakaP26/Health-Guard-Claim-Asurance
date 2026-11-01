<?php

namespace Tests\Feature;

use App\Models\Claim;
use App\Models\ClaimHistory;
use App\Models\User;
use App\Services\ClaimHistoryService;
use App\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductWorkflowsTest extends TestCase
{
    use RefreshDatabase;

    private function person(string $role = 'client'): User
    {
        return User::factory()->create(['role' => $role, 'password' => Hash::make('secure-test-password')]);
    }

    private function submit(User $user): string
    {
        Sanctum::actingAs($user);

        return $this->postJson('/api/claims', ['client_name' => 'Patient', 'provider_name' => 'Hospital', 'type' => 'Outpatient', 'amount' => '500.00'])->assertCreated()->json('claim_id');
    }

    public function test_history_resubmission_preserves_assignment_notes_and_previous_amount(): void
    {
        $client = $this->person();
        $analyst = $this->person('analyst');
        $id = $this->submit($client);
        Sanctum::actingAs($analyst);
        $this->postJson("/api/claims/$id/assign")->assertOk();
        $this->patchJson("/api/claims/$id/status", ['status' => 'Partially Approved', 'approved_amount' => '200.00', 'notes' => 'Partial evidence'])->assertOk();
        Sanctum::actingAs($client);
        $this->putJson("/api/claims/$id", ['amount' => '400.00'])->assertOk()->assertJsonPath('status', 'Pending')->assertJsonPath('assigned_to', $analyst->id)->assertJsonPath('notes', 'Partial evidence')->assertJsonPath('approved_amount', null);
        $this->getJson("/api/claims/$id/history?order=asc")->assertOk()->assertJsonCount(4, 'data')->assertJsonPath('data.3.metadata.previous.approved_amount', '200.00');
        Sanctum::actingAs($this->person());
        $this->getJson("/api/claims/$id/history")->assertForbidden();
    }

    public function test_history_failure_rolls_back_claim_and_notifications(): void
    {
        $this->mock(ClaimHistoryService::class)->shouldReceive('record')->once()->andThrow(new \RuntimeException('simulated history failure'));
        Sanctum::actingAs($this->person());
        $this->postJson('/api/claims', ['client_name' => 'Patient', 'provider_name' => 'Hospital', 'type' => 'Outpatient', 'amount' => 500])->assertStatus(500);
        $this->assertDatabaseCount('claims', 0);
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_history_backfill_is_honest_and_idempotent(): void
    {
        $user = $this->person();
        Claim::create(['claim_id' => 'CLM-2025-001', 'user_id' => $user->id, 'client_name' => 'Old', 'provider_name' => 'Old', 'type' => 'Old', 'amount' => 10, 'status' => 'Rejected', 'notes' => 'Legacy note', 'date_submitted' => '2025-01-01']);
        $this->artisan('healthguard:backfill-history')->assertSuccessful();
        $this->artisan('healthguard:backfill-history')->assertSuccessful();
        $this->assertDatabaseCount('claim_histories', 2);
        $this->assertDatabaseHas('claim_histories', ['event' => 'migrated_snapshot', 'to_status' => 'Rejected']);
    }

    public function test_history_models_reject_rewrites(): void
    {
        $id = $this->submit($this->person());
        $row = ClaimHistory::firstOrFail();
        $this->expectException(\LogicException::class);
        $row->update(['notes' => 'forged']);
    }

    public function test_filters_stats_and_export_cover_all_pages_and_escape_formulas(): void
    {
        $client = $this->person();
        $first = $this->submit($client);
        $second = $this->submit($client);
        Claim::where('claim_id', $first)->update(['client_name' => '=HYPERLINK("bad")']);
        Sanctum::actingAs($this->person('analyst'));
        $this->getJson('/api/claims?per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('stats.total', 2);
        $this->getJson('/api/claims?date_to='.now()->format('Y-m-d'))->assertOk()->assertJsonPath('total', 2);
        $this->getJson('/api/claims?q='.$second)->assertOk()->assertJsonPath('stats.total', 1);
        $csv = $this->get('/api/claims/export')->assertOk()->streamedContent();
        $this->assertStringContainsString($first, $csv);
        $this->assertStringContainsString($second, $csv);
        $this->assertStringContainsString("'=HYPERLINK", $csv);
    }

    public function test_drafts_are_private_and_do_not_submit_claims(): void
    {
        $client = $this->person();
        Sanctum::actingAs($client);
        $id = $this->postJson('/api/drafts', ['data' => ['client_name' => 'Incomplete', 'step' => 2]])->assertCreated()->json('id');
        $this->assertDatabaseCount('claims', 0);
        Sanctum::actingAs($this->person());
        $this->putJson("/api/drafts/$id", ['data' => ['amount' => 12]])->assertNotFound();
        $this->deleteJson("/api/drafts/$id")->assertNotFound();
        $this->getJson('/api/drafts')->assertJsonCount(0);
    }

    public function test_messages_and_document_requests_are_scoped_and_audited(): void
    {
        Storage::fake('private');
        $client = $this->person();
        $analyst = $this->person('analyst');
        $id = $this->submit($client);
        Sanctum::actingAs($analyst);
        $this->postJson("/api/claims/$id/messages", ['body' => 'Not assigned'])->assertForbidden();
        $this->postJson("/api/claims/$id/assign")->assertOk();
        $request = $this->postJson("/api/claims/$id/document-requests", ['title' => 'Receipt', 'instructions' => 'Please provide receipt'])->assertCreated()->json('id');
        $this->getJson("/api/claims/$id")->assertJsonPath('status', 'Needs Info');
        Sanctum::actingAs($client);
        $message = $this->postJson("/api/claims/$id/messages", ['body' => 'Here is the receipt'])->assertCreated()->json('id');
        $this->postJson("/api/claims/$id/documents", ['file' => UploadedFile::fake()->createWithContent('receipt.pdf', "%PDF-1.4\nreceipt"), 'request_id' => $request, 'message_id' => $message])->assertCreated();
        $this->assertDatabaseHas('claim_document_requests', ['id' => $request, 'status' => 'fulfilled']);
        Sanctum::actingAs($this->person());
        $this->getJson("/api/claims/$id/messages")->assertForbidden();
    }

    public function test_payment_only_admin_and_cannot_exceed_approval_or_rewrite_settlement(): void
    {
        $client = $this->person();
        $analyst = $this->person('analyst');
        $id = $this->submit($client);
        Sanctum::actingAs($analyst);
        $this->postJson("/api/claims/$id/assign")->assertOk();
        $this->patchJson("/api/claims/$id/status", ['status' => 'Approved'])->assertOk();
        $data = ['status' => 'paid', 'amount' => 500, 'reference' => 'BANK-TEST', 'paid_at' => now()->toDateString()];
        $this->postJson("/api/claims/$id/payment", $data)->assertForbidden();
        Sanctum::actingAs($this->person('admin'));
        $this->postJson("/api/claims/$id/payment", array_replace($data, ['amount' => 501]))->assertUnprocessable();
        $this->postJson("/api/claims/$id/payment", $data)->assertOk();
        $this->postJson("/api/claims/$id/payment", $data)->assertConflict();
        $this->postJson("/api/claims/$id/payment", array_replace($data, ['status' => 'settled', 'reference' => 'OTHER']))->assertUnprocessable();
        $this->postJson("/api/claims/$id/payment", array_replace($data, ['status' => 'settled']))->assertOk();
        Sanctum::actingAs($analyst);
        $this->patchJson("/api/claims/$id/status", ['status' => 'Rejected', 'notes' => 'change'])->assertConflict();
    }

    public function test_invitation_single_use_and_disable_revokes_tokens(): void
    {
        $admin = $this->person('admin');
        Sanctum::actingAs($admin);
        $url = $this->postJson('/api/admin/invitations', ['email' => 'invited@example.test'])->assertCreated()->json('invitation_url');
        parse_str(parse_url($url, PHP_URL_QUERY), $query);
        $data = ['token' => $query['token'], 'name' => 'Invited', 'password' => 'secure-test-password', 'password_confirmation' => 'secure-test-password'];
        $this->postJson('/api/invitations/accept', $data)->assertCreated()->assertJsonPath('user.role', 'analyst');
        $this->postJson('/api/invitations/accept', $data)->assertUnprocessable();
        $invited = User::where('email', 'invited@example.test')->firstOrFail();
        $invited->createToken('test');
        $this->patchJson('/api/admin/users/'.$invited->id.'/active', ['is_active' => false])->assertOk();
        $this->assertSame(0, $invited->tokens()->count());
        Sanctum::actingAs($invited->fresh());
        $this->getJson('/api/claims')->assertForbidden();
    }

    public function test_totp_known_vector_replay_and_recovery_code(): void
    {
        $totp = app(TwoFactorService::class);
        $this->assertSame('287082', $totp->code('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1));
        $staff = $this->person('analyst');
        Sanctum::actingAs($staff);
        $secret = $this->postJson('/api/two-factor/setup', ['password' => 'secure-test-password'])->assertOk()->json('secret');
        $code = $totp->code($secret, intdiv(now()->timestamp, 30));
        $recovery = $this->postJson('/api/two-factor/confirm', ['code' => $code])->assertOk()->json('recovery_codes.0');
        $this->assertNotEquals($secret, DB::table('users')->where('id', $staff->id)->value('two_factor_secret'));
        $login = ['email' => $staff->email, 'password' => 'secure-test-password'];
        $this->postJson('/api/login', $login)->assertUnprocessable();
        $this->postJson('/api/login', $login + ['two_factor_code' => $code])->assertUnprocessable();
        $this->postJson('/api/login', $login + ['two_factor_code' => $recovery])->assertOk();
        $this->postJson('/api/login', $login + ['two_factor_code' => $recovery])->assertUnprocessable();
    }

    public function test_password_reset_is_single_use_and_revokes_tokens(): void
    {
        $user = $this->person();
        $user->createToken('old');
        $token = Password::createToken($user);
        $data = ['email' => $user->email, 'token' => $token, 'password' => 'new-secure-password', 'password_confirmation' => 'new-secure-password'];
        $this->postJson('/api/reset-password', $data)->assertOk();
        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/reset-password', $data)->assertUnprocessable();
    }

    public function test_retention_disabled_by_default_and_open_claims_protected(): void
    {
        $client = $this->person();
        $this->submit($client);
        $id = $this->postJson('/api/deletion-requests', ['reason' => 'Delete account'])->assertCreated()->json('id');
        Sanctum::actingAs($this->person('admin'));
        $data = ['status' => 'approved', 'review_notes' => 'Reviewed', 'confirm' => true];
        $this->patchJson("/api/admin/deletion-requests/$id", $data)->assertConflict();
        config(['healthguard.features.retention' => true]);
        $this->patchJson("/api/admin/deletion-requests/$id", $data)->assertConflict();
        $this->assertDatabaseHas('users', ['id' => $client->id]);
        $this->patchJson("/api/admin/deletion-requests/$id", array_replace($data, ['status' => 'rejected']))->assertOk();
    }

    public function test_catalog_and_analytics_access_and_maximum_amount(): void
    {
        $user = $this->person();
        Sanctum::actingAs($user);
        $this->postJson('/api/claims', ['client_name' => 'P', 'provider_name' => 'H', 'type' => 'T', 'amount' => '100000000.00'])->assertUnprocessable();
        $this->getJson('/api/analytics')->assertForbidden();
        $this->postJson('/api/admin/catalog/providers', ['name' => 'H', 'code' => 'H'])->assertForbidden();
        Sanctum::actingAs($this->person('admin'));
        $this->postJson('/api/admin/catalog/categories',['name' => 'Outpatient', 'code' => 'OP', 'coverage_limit' => '1000.00'])->assertCreated();
        $this->getJson('/api/catalog')->assertOk()->assertJsonCount(1,'categories');
        $this->getJson('/api/analytics')->assertOk();
    }
}
