<?php

namespace Tests\Feature;

use App\Models\Claim;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClaimFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_claim_gets_next_sequential_claim_id(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $this->makeClaim($client, ['claim_id' => 'CLM-' . date('Y') . '-007']);

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/claims', [
            'client_name' => 'John Doe',
            'type' => 'Rawat Jalan',
            'provider_name' => 'Klinik Sehat',
            'amount' => 250,
        ]);

        $response->assertCreated()
            ->assertJsonPath('claim_id', 'CLM-' . date('Y') . '-008')
            ->assertJsonPath('status', 'Pending')
            ->assertJsonPath('user_id', $client->id);
    }

    public function test_consecutive_claims_get_unique_claim_ids(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        Sanctum::actingAs($client);

        $payload = [
            'client_name' => 'John Doe',
            'type' => 'Rawat Jalan',
            'provider_name' => 'Klinik Sehat',
            'amount' => 250,
        ];

        $firstId = $this->postJson('/api/claims', $payload)->assertCreated()->json('claim_id');
        $secondId = $this->postJson('/api/claims', $payload)->assertCreated()->json('claim_id');

        $this->assertSame('CLM-' . date('Y') . '-001', $firstId);
        $this->assertSame('CLM-' . date('Y') . '-002', $secondId);
    }

    public function test_only_analyst_can_assign_a_claim(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $claim = $this->makeClaim($client);

        Sanctum::actingAs($client);
        $this->postJson("/api/claims/{$claim->claim_id}/assign")->assertForbidden();

        Sanctum::actingAs($analyst);
        $this->postJson("/api/claims/{$claim->claim_id}/assign")
            ->assertOk()
            ->assertJsonPath('claim.assigned_to', $analyst->id);

        $this->assertSame($analyst->id, $claim->fresh()->assigned_to);
    }

    public function test_claim_cannot_be_assigned_twice(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $otherAnalyst = User::factory()->create(['role' => 'analyst']);
        $claim = $this->makeClaim($client, ['assigned_to' => $analyst->id]);

        Sanctum::actingAs($otherAnalyst);

        $this->postJson("/api/claims/{$claim->claim_id}/assign")->assertStatus(409);
    }

    public function test_status_can_be_updated_without_notes(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $claim = $this->makeClaim($client);

        Sanctum::actingAs($analyst);

        $this->patchJson("/api/claims/{$claim->claim_id}/status", ['status' => 'Approved'])
            ->assertOk()
            ->assertJsonPath('status', 'Approved');

        $notification = Notification::where('user_id', $client->id)->first();
        $this->assertNotNull($notification);
        $this->assertStringContainsString(
            'status has been updated to Approved.',
            $notification->body
        );
    }

    public function test_claim_can_be_partially_approved(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $claim = $this->makeClaim($client);

        Sanctum::actingAs($analyst);

        $this->patchJson("/api/claims/{$claim->claim_id}/status", [
            'status' => 'Partially Approved',
            'approved_amount' => 400,
        ])->assertOk()->assertJsonPath('status', 'Partially Approved');

        $this->assertEquals(400, $claim->fresh()->approved_amount);
    }

    public function test_only_claim_owner_can_update_claim_data(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $stranger = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $claim = $this->makeClaim($owner, ['status' => 'Partially Approved', 'approved_amount' => 100]);

        Sanctum::actingAs($stranger);
        $this->putJson("/api/claims/{$claim->claim_id}", ['amount' => 900])->assertForbidden();

        Sanctum::actingAs($analyst);
        $this->putJson("/api/claims/{$claim->claim_id}", ['amount' => 900])->assertForbidden();

        Sanctum::actingAs($owner);
        $this->putJson("/api/claims/{$claim->claim_id}", ['amount' => 900])
            ->assertOk()
            ->assertJsonPath('status', 'Pending')
            ->assertJsonPath('approved_amount', null);

        $this->assertEquals(900, $claim->fresh()->amount);
    }

    private function makeClaim(User $owner, array $attributes = []): Claim
    {
        return Claim::create(array_merge([
            'user_id' => $owner->id,
            'claim_id' => 'CLM-' . date('Y') . '-001',
            'client_name' => $owner->name,
            'type' => 'Rawat Inap',
            'provider_name' => 'RS Sehat',
            'amount' => 1000,
            'status' => 'Pending',
            'date_submitted' => now(),
        ], $attributes));
    }
}
