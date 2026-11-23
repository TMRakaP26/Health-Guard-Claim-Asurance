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
        $this->makeClaim($client, ['claim_id' => 'CLM-'.date('Y').'-007']);

        Sanctum::actingAs($client);

        $response = $this->postJson('/api/claims', [
            'client_name' => 'John Doe',
            'type' => 'Rawat Jalan',
            'provider_name' => 'Klinik Sehat',
            'amount' => 250,
        ]);

        $response->assertCreated()
            ->assertJsonPath('claim_id', 'CLM-'.date('Y').'-008')
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

        $this->assertSame('CLM-'.date('Y').'-001', $firstId);
        $this->assertSame('CLM-'.date('Y').'-002', $secondId);
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
        $claim = $this->makeClaim($client, ['assigned_to' => $analyst->id]);

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
        $claim = $this->makeClaim($client, ['assigned_to' => $analyst->id]);

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

    public function test_claim_exposes_server_derived_client_id_and_disease_fields(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        $other = User::factory()->create(['role' => 'client']);
        Sanctum::actingAs($client);

        $response = $this->postJson('/api/claims', [
            'client_name' => 'John Doe',
            'type' => 'Rawat Jalan',
            'disease_name' => 'Hipertensi',
            'description' => 'Kontrol tekanan darah bulanan',
            'provider_name' => 'RS Sehat',
            'amount' => 250,
            // These payload keys must never change ownership or identity.
            'user_id' => $other->id,
            'client_id' => 'CL-999999',
        ])->assertCreated()
            ->assertJsonPath('user_id', $client->id)
            ->assertJsonPath('client_id', User::clientIdFor($client->id))
            ->assertJsonPath('disease_name', 'Hipertensi')
            ->assertJsonPath('description', 'Kontrol tekanan darah bulanan');

        $this->assertDatabaseHas('claims', [
            'id' => $response->json('id'),
            'user_id' => $client->id,
            'disease_name' => 'Hipertensi',
            'description' => 'Kontrol tekanan darah bulanan',
        ]);
    }

    public function test_user_endpoint_exposes_derived_client_id(): void
    {
        $client = User::factory()->create(['role' => 'client']);
        Sanctum::actingAs($client);

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('client_id', User::clientIdFor($client->id));
    }

    public function test_resubmitting_one_claim_never_changes_another_claim(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $first = $this->makeClaim($owner, [
            'claim_id' => 'CLM-'.date('Y').'-101',
            'status' => 'Partially Approved',
            'approved_amount' => 100,
        ]);
        $second = $this->makeClaim($owner, [
            'claim_id' => 'CLM-'.date('Y').'-102',
            'amount' => 750,
            'provider_name' => 'RS Lain',
        ]);
        $before = $second->only(['amount', 'provider_name', 'status', 'claim_id']);

        Sanctum::actingAs($owner);
        $this->putJson('/api/claims/'.$first->claim_id, [
            'amount' => 900,
            'disease_name' => 'Diabetes',
            'description' => 'Perbaikan data',
        ])->assertOk()->assertJsonPath('claim_id', $first->claim_id);

        $this->assertSame(900, (int) $first->fresh()->amount);
        $this->assertSame($before, $second->fresh()->only(['amount', 'provider_name', 'status', 'claim_id']));
    }

    private function makeClaim(User $owner, array $attributes = []): Claim
    {
        return Claim::create(array_merge([
            'user_id' => $owner->id,
            'claim_id' => 'CLM-'.date('Y').'-001',
            'client_name' => $owner->name,
            'type' => 'Rawat Inap',
            'provider_name' => 'RS Sehat',
            'amount' => 1000,
            'status' => 'Pending',
            'date_submitted' => now(),
        ], $attributes));
    }
}
