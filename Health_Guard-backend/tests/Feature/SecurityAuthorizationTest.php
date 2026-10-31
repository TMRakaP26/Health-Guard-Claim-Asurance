<?php

namespace Tests\Feature;

use App\Models\Claim;
use App\Models\Document;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SecurityAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public static function viewers(): array
    {
        return [
            'guest' => ['guest', 401], 'owner' => ['owner', 200],
            'other client' => ['other', 403], 'assigned analyst' => ['assigned', 200],
            'other analyst may inspect' => ['analyst', 200], 'unknown role denied' => ['unknown', 403],
        ];
    }

    #[DataProvider('viewers')]
    public function test_claim_and_document_access_matrix(string $role, int $expected): void
    {
        Storage::fake('private');
        $owner = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $claim = $this->claim($owner, ['assigned_to' => $analyst->id]);
        $document = $claim->documents()->create([
            'file_name' => 'evidence.pdf', 'file_path' => 'documents/evidence.pdf',
            'file_size' => 13, 'mime_type' => 'application/pdf',
        ]);
        Storage::disk('private')->put($document->file_path, '%PDF-1.4 test');
        $viewer = match ($role) {
            'guest' => null, 'owner' => $owner, 'assigned' => $analyst,
            'analyst' => User::factory()->create(['role' => 'analyst']),
            'unknown' => User::factory()->create(['role' => 'client'])->forceFill(['role' => 'unknown']),
            default => User::factory()->create(['role' => 'client']),
        };
        if ($viewer) {
            Sanctum::actingAs($viewer);
        }
        foreach (["/api/claims/{$claim->claim_id}", "/api/claims/{$claim->claim_id}/documents",
            "/api/claims/{$claim->claim_id}/documents/{$document->id}/download"] as $url) {
            $response = $this->getJson($url)->assertStatus($expected);
            if ($expected === 200 && str_ends_with($url, '/download')) {
                $response->assertHeader('X-Content-Type-Options', 'nosniff');
                $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
            }
        }
        // Laravel's local storage route denies requests without a valid signature.
        // The Nginx integration smoke separately asserts its 404 response.
        $this->get('/storage/documents/evidence.pdf')->assertForbidden();
    }

    public function test_clients_cannot_use_any_analyst_endpoint(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $claim = $this->claim($owner);
        Sanctum::actingAs($owner);
        $this->getJson('/api/claims/unassigned')->assertForbidden();
        $this->getJson('/api/claims/my-assignments')->assertForbidden();
        $this->postJson("/api/claims/{$claim->claim_id}/assign")->assertForbidden();
        $this->patchJson("/api/claims/{$claim->claim_id}/status", ['status' => 'Approved'])->assertForbidden();
    }

    public function test_only_assigned_analyst_may_decide(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $assigned = User::factory()->create(['role' => 'analyst']);
        $other = User::factory()->create(['role' => 'analyst']);
        $claim = $this->claim($owner);
        Sanctum::actingAs($assigned);
        $this->patchJson("/api/claims/{$claim->claim_id}/status", ['status' => 'Approved'])->assertForbidden();
        $this->postJson("/api/claims/{$claim->claim_id}/assign")->assertOk();
        Sanctum::actingAs($other);
        $this->patchJson("/api/claims/{$claim->claim_id}/status", ['status' => 'Approved'])->assertForbidden();
        Sanctum::actingAs($assigned);
        $this->patchJson("/api/claims/{$claim->claim_id}/status", ['status' => 'Approved'])->assertOk();
    }

    public function test_assignment_only_accepts_pending_and_unassigned_claims(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $claim = $this->claim($owner, ['status' => 'Rejected']);
        Sanctum::actingAs($analyst);
        $this->postJson("/api/claims/{$claim->claim_id}/assign")->assertStatus(409);
        $this->assertNull($claim->fresh()->assigned_to);
        $this->assertSame(0, Notification::count());
        $claim->update(['status' => 'Pending']);
        $this->postJson("/api/claims/{$claim->claim_id}/assign")->assertOk();
        Sanctum::actingAs(User::factory()->create(['role' => 'analyst']));
        $this->postJson("/api/claims/{$claim->claim_id}/assign")->assertStatus(409);
        $this->assertSame($analyst->id, $claim->fresh()->assigned_to);
        $this->assertSame(1, Notification::count());
    }

    public function test_client_list_only_contains_owned_claims_and_analyst_sees_all(): void
    {
        $first = User::factory()->create(['role' => 'client']);
        $second = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $firstClaim = $this->claim($first, ['assigned_to' => $analyst->id]);
        $secondClaim = $this->claim($second);
        Sanctum::actingAs($first);
        $this->getJson('/api/claims')->assertJsonCount(1, 'data')->assertJsonPath('data.0.claim_id', $firstClaim->claim_id);
        Sanctum::actingAs($analyst);
        $this->getJson('/api/claims')->assertJsonCount(2, 'data');
        $this->getJson('/api/claims/my-assignments')->assertJsonCount(1, 'data')->assertJsonPath('data.0.claim_id', $firstClaim->claim_id);
        $this->getJson('/api/claims/unassigned')->assertJsonCount(1, 'data')->assertJsonPath('data.0.claim_id', $secondClaim->claim_id);
    }

    public function test_non_owners_and_analysts_cannot_upload_or_modify_client_claims(): void
    {
        Storage::fake('private');
        $owner = User::factory()->create(['role' => 'client']);
        $claim = $this->claim($owner);
        foreach (['client', 'analyst'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));
            $this->putJson("/api/claims/{$claim->claim_id}", ['amount' => 200])->assertForbidden();
            $this->postJson("/api/claims/{$claim->claim_id}/documents", [
                'file' => UploadedFile::fake()->createWithContent('test.pdf', '%PDF-1.4 test'),
            ])->assertForbidden();
        }
        $this->postJson('/api/claims', [])->assertForbidden();
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_document_id_must_belong_to_requested_claim(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $first = $this->claim($owner);
        $second = $this->claim($owner);
        $document = Document::create([
            'claim_id' => $second->id, 'file_name' => 'test.pdf', 'file_path' => 'documents/test.pdf',
            'file_size' => 10, 'mime_type' => 'application/pdf',
        ]);
        Sanctum::actingAs($owner);
        $this->getJson("/api/claims/{$first->claim_id}/documents/{$document->id}/download")->assertNotFound();
        $this->getJson('/api/claims/CLM-unknown')->assertNotFound();
    }

    public function test_notifications_remain_scoped_to_recipient(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $other = User::factory()->create(['role' => 'client']);
        $notification = Notification::create([
            'user_id' => $owner->id, 'type' => 'status_changed', 'title' => 'Decision', 'body' => 'Claim updated',
        ]);
        Sanctum::actingAs($other);
        $this->getJson('/api/notifications')->assertJsonCount(0, 'data');
        $this->postJson("/api/notifications/{$notification->id}/read")->assertNotFound();
        $this->postJson('/api/notifications/read-all')->assertOk();
        $this->assertFalse($notification->fresh()->is_read);
        Sanctum::actingAs($owner);
        $this->postJson("/api/notifications/{$notification->id}/read")->assertOk();
    }

    private function claim(User $owner, array $attributes = []): Claim
    {
        return Claim::create(array_merge([
            'user_id' => $owner->id, 'claim_id' => 'CLM-2026-'.(Claim::count() + 1),
            'client_name' => 'Client', 'provider_name' => 'Provider', 'type' => 'Consultation',
            'amount' => 500, 'status' => 'Pending', 'date_submitted' => now(),
        ], $attributes));
    }
}
