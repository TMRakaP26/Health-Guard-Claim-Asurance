<?php

namespace Tests\Feature;

use App\Models\User;
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

    public function test_sqlite_import_preserves_ids_hashes_and_is_non_repeatable(): void
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
            $source = null;
            $this->artisan('healthguard:import-sqlite', ['source' => $path])->assertSuccessful();
            $this->assertDatabaseHas('users', ['id' => 77, 'email' => 'import@example.test', 'password' => $hash]);
            $this->artisan('healthguard:import-sqlite', ['source' => $path])->assertFailed();
            $this->assertDatabaseCount('users', 1);
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
