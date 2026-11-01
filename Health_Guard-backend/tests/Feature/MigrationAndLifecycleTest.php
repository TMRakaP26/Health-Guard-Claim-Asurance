<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ClaimService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MigrationAndLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_verification_requires_valid_signature_and_own_user(): void
    {
        $user = User::factory()->create(['email_verified_at' => null, 'role' => 'client']);
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(5), ['id' => $user->id, 'hash' => sha1($user->email)]);
        Sanctum::actingAs(User::factory()->create(['role' => 'client']));
        $this->getJson($url)->assertForbidden();
        Sanctum::actingAs($user);
        $this->getJson($url)->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->getJson($url.'tampered')->assertForbidden();
    }

    public function test_sqlite_import_preserves_relationships_history_and_next_claim_id(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('Requires isolated MySQL CI database.');
        }
        $path = tempnam(sys_get_temp_dir(), 'healthguard-import-');
        try {
            $source = new \PDO('sqlite:'.$path);
            $source->exec('CREATE TABLE users (id INTEGER PRIMARY KEY,name TEXT,email TEXT,password TEXT,role TEXT,created_at TEXT,updated_at TEXT)');
            $hash = Hash::make('imported-password');
            $source->prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?)')->execute([77, 'Imported', 'import@example.test', $hash, 'client', '2025-01-01 12:00:00', '2025-01-01 12:00:00']);
            $source->prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?)')->execute([78, 'Analyst', 'analyst-import@example.test', $hash, 'analyst', '2025-01-01 12:00:00', '2025-01-01 12:00:00']);
            $source->exec('CREATE TABLE claims (id INTEGER PRIMARY KEY, user_id INTEGER, assigned_to INTEGER, claim_id TEXT, client_name TEXT, provider_name TEXT, type TEXT, amount TEXT, approved_amount TEXT, status TEXT, notes TEXT, date_submitted TEXT)');
            $publicId = 'CLM-'.now()->year.'-099';
            $source->prepare('INSERT INTO claims VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')->execute([55, 77, 78, $publicId, 'Imported', 'Provider', 'Outpatient', '150.25', '100.25', 'Partially Approved', 'Legacy review', '2025-01-01T12:00:00.000000Z']);
            $source->exec('CREATE TABLE documents (id INTEGER PRIMARY KEY, claim_id INTEGER, file_name TEXT, file_path TEXT, file_size INTEGER, mime_type TEXT)');
            $source->exec("INSERT INTO documents VALUES (33,55,'legacy.pdf','documents/legacy.pdf',123,'application/pdf')");
            $source->exec('CREATE TABLE notifications (id INTEGER PRIMARY KEY, user_id INTEGER, type TEXT, title TEXT, claim_id TEXT, is_read INTEGER)');
            $source->prepare('INSERT INTO notifications VALUES (?,?,?,?,?,?)')->execute([22, 77, 'status_changed', 'Legacy notification', $publicId, 1]);
            $source = null;
            $checksum = hash_file('sha256', $path);
            $this->artisan('healthguard:import-sqlite', ['source' => $path])->assertSuccessful();
            $this->assertDatabaseHas('users', ['id' => 77, 'email' => 'import@example.test', 'password' => $hash]);
            $this->assertDatabaseHas('claims', ['id' => 55, 'user_id' => 77, 'assigned_to' => 78, 'claim_id' => $publicId, 'amount' => '150.25', 'approved_amount' => '100.25', 'status' => 'Partially Approved', 'notes' => 'Legacy review', 'date_submitted' => '2025-01-01 12:00:00']);
            $this->assertDatabaseHas('documents', ['id' => 33, 'claim_id' => 55, 'file_path' => 'documents/legacy.pdf']);
            $this->assertDatabaseHas('notifications', ['id' => 22, 'user_id' => 77, 'claim_id' => $publicId, 'is_read' => 1]);
            $this->assertDatabaseHas('claim_histories', ['claim_id' => 55, 'event' => 'migrated_snapshot', 'notes' => 'Legacy review', 'approved_amount' => '100.25']);
            $this->assertDatabaseCount('claim_histories', 2);
            $this->artisan('healthguard:backfill-history')->assertSuccessful();
            $this->assertDatabaseCount('claim_histories', 2);
            $this->artisan('healthguard:import-sqlite', ['source' => $path])->assertFailed();
            $this->assertDatabaseCount('users', 2);
            $claim = app(ClaimService::class)->create(User::findOrFail(77), ['client_name' => 'New', 'provider_name' => 'Provider', 'type' => 'Outpatient', 'amount' => '10.00']);
            $this->assertSame('CLM-'.now()->year.'-100', $claim->claim_id);
            $this->assertSame($checksum, hash_file('sha256', $path));
        } finally {
            if (file_exists($path)) {
                unlink($path);
            }
        }
    }

    public function test_sqlite_import_rolls_back_all_records_on_invalid_relationship(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('Requires isolated MySQL CI database.');
        }
        $path = tempnam(sys_get_temp_dir(), 'healthguard-invalid-import-');
        try {
            $source = new \PDO('sqlite:'.$path);
            $source->exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT, role TEXT)');
            $source->prepare('INSERT INTO users VALUES (?,?,?,?,?)')->execute([77, 'Imported', 'rollback@example.test', Hash::make('imported-password'), 'client']);
            $source->exec('CREATE TABLE documents (id INTEGER PRIMARY KEY, claim_id INTEGER, file_name TEXT, file_path TEXT, file_size INTEGER, mime_type TEXT)');
            $source->exec("INSERT INTO documents VALUES (33,999,'missing.pdf','documents/missing.pdf',123,'application/pdf')");
            $source = null;
            $checksum = hash_file('sha256', $path);
            $this->artisan('healthguard:import-sqlite', ['source' => $path])->assertFailed();
            $this->assertDatabaseCount('users', 0);
            $this->assertDatabaseCount('documents', 0);
            $this->assertSame($checksum, hash_file('sha256', $path));
        } finally {
            if (file_exists($path)) {
                unlink($path);
            }
        }
    }

    public function test_import_refuses_sqlite_destination_without_mutating_source(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            $this->markTestSkipped('SQLite destination guard.');
        }
        $this->artisan('healthguard:import-sqlite', ['source' => 'does-not-exist.sqlite'])->assertFailed();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_retention_removes_owned_records_and_preserves_review(): void
    {
        config(['healthguard.features.retention' => true]);
        $client = User::factory()->create(['role' => 'client']);
        Sanctum::actingAs($client);
        $claim = $this->postJson('/api/claims', ['client_name' => 'Test', 'provider_name' => 'Test', 'type' => 'Test', 'amount' => 10])->assertCreated()->json('claim_id');
        DB::table('claims')->where('claim_id', $claim)->update(['status' => 'Rejected']);
        $id = $this->postJson('/api/deletion-requests', ['reason' => 'Delete'])->assertCreated()->json('id');
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->patchJson('/api/admin/deletion-requests/'.$id, ['status' => 'approved', 'review_notes' => 'Approved test policy', 'confirm' => true])->assertOk()->assertJsonPath('user_id', null);
        $this->assertDatabaseMissing('users', ['id' => $client->id]);
        $this->assertDatabaseCount('claims', 0);
        $this->assertDatabaseCount('claim_histories', 0);
        $this->assertDatabaseHas('deletion_requests', ['id' => $id, 'status' => 'approved']);
    }
}
