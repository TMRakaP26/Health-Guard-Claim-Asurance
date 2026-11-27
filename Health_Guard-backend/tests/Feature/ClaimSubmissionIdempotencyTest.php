<?php

namespace Tests\Feature;

use App\Models\Claim;
use App\Models\ClaimDraft;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClaimSubmissionIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private function client(): User
    {
        return User::factory()->create(['role' => 'client']);
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'client_name' => 'Patient',
            'provider_name' => 'Hospital',
            'type' => 'Outpatient',
            'amount' => 500,
        ], $extra);
    }

    public function test_replaying_a_submission_key_creates_one_claim_history_and_notification_set(): void
    {
        $analyst = User::factory()->create(['role' => 'analyst']);
        Sanctum::actingAs($this->client());
        $payload = $this->payload(['submission_key' => 'submit-11111111-1111-4111-8111-111111111111']);

        $first = $this->postJson('/api/claims', $payload)->assertCreated();
        $second = $this->postJson('/api/claims', $payload)->assertOk();

        $this->assertSame($first->json('claim_id'), $second->json('claim_id'));
        $this->assertDatabaseCount('claims', 1);
        $claim = Claim::firstOrFail();
        $this->assertSame('submit-11111111-1111-4111-8111-111111111111', $claim->submission_key);
        $this->assertSame(1, $claim->histories()->where('event', 'submitted')->count());
        $this->assertSame(1, Notification::where('user_id', $analyst->id)->count());
    }

    public function test_replay_does_not_consume_a_claim_number(): void
    {
        Sanctum::actingAs($this->client());
        $key = ['submission_key' => 'sequence-11111111-1111-4111-8111-111111111111'];

        $first = $this->postJson('/api/claims', $this->payload($key))->assertCreated()->json('claim_id');
        $this->postJson('/api/claims', $this->payload($key))->assertOk();
        $second = $this->postJson('/api/claims', $this->payload(['submission_key' => 'sequence-22222222-2222-4222-8222-222222222222']))
            ->assertCreated()->json('claim_id');

        $this->assertSame('CLM-'.date('Y').'-001', $first);
        $this->assertSame('CLM-'.date('Y').'-002', $second);
    }

    public function test_different_clients_may_reuse_the_same_submission_key(): void
    {
        $first = $this->client();
        $second = $this->client();
        $payload = $this->payload(['submission_key' => 'shared-11111111-1111-4111-8111-111111111111']);

        Sanctum::actingAs($first);
        $firstId = $this->postJson('/api/claims', $payload)->assertCreated()->json('claim_id');
        Sanctum::actingAs($second);
        $secondId = $this->postJson('/api/claims', $payload)->assertCreated()->json('claim_id');

        $this->assertNotSame($firstId, $secondId);
        $this->assertDatabaseCount('claims', 2);
    }

    public function test_creating_a_claim_retires_its_draft_and_replay_still_returns_it(): void
    {
        Sanctum::actingAs($this->client());
        $draftId = $this->postJson('/api/drafts', ['data' => ['client_name' => 'Patient', 'step' => 4]])
            ->assertCreated()->json('id');
        $payload = $this->payload(['submission_key' => 'draft-11111111-1111-4111-8111-111111111111', 'draft_id' => $draftId]);

        $claimId = $this->postJson('/api/claims', $payload)->assertCreated()->json('claim_id');

        $this->assertDatabaseMissing('claim_drafts', ['id' => $draftId]);
        $this->getJson('/api/drafts')->assertOk()->assertJsonCount(0);

        // The retried request no longer has a draft, yet it must not create a claim.
        $this->postJson('/api/claims', $payload)->assertOk()->assertJsonPath('claim_id', $claimId);
        $this->assertDatabaseCount('claims', 1);
        $this->assertDatabaseCount('claim_histories', 1);
    }

    public function test_a_foreign_draft_cannot_be_converted_into_a_claim(): void
    {
        $owner = $this->client();
        Sanctum::actingAs($owner);
        $draftId = $this->postJson('/api/drafts', ['data' => ['client_name' => 'Mine']])->assertCreated()->json('id');

        Sanctum::actingAs($this->client());
        $this->postJson('/api/claims', $this->payload(['draft_id' => $draftId]))->assertNotFound();

        $this->assertDatabaseCount('claims', 0);
        $this->assertSame(1, ClaimDraft::whereKey($draftId)->where('user_id', $owner->id)->count());
    }

    public function test_a_malformed_submission_key_is_rejected(): void
    {
        Sanctum::actingAs($this->client());

        $this->postJson('/api/claims', $this->payload(['submission_key' => 'short']))
            ->assertUnprocessable()->assertJsonValidationErrors('submission_key');
        $this->assertDatabaseCount('claims', 0);
    }

    public function test_submission_without_a_key_keeps_legacy_behaviour(): void
    {
        Sanctum::actingAs($this->client());

        $this->postJson('/api/claims', $this->payload())->assertCreated();
        $this->postJson('/api/claims', $this->payload())->assertCreated();

        $this->assertDatabaseCount('claims', 2);
        $this->assertSame(2, Claim::whereNull('submission_key')->count());
    }
}
