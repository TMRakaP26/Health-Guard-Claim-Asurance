<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_public_registration_cannot_create_an_analyst(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Untrusted', 'email' => 'untrusted@example.test',
            'password' => 'password123', 'role' => 'analyst',
        ])->assertUnprocessable()->assertJsonValidationErrors('role');
        $this->assertDatabaseMissing('users', ['email' => 'untrusted@example.test']);
    }

    public function test_demo_users_is_not_available_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['app.debug' => false]);
        $response = $this->getJson('/api/demo-users')->assertNotFound();
        $response->assertJsonMissingPath('trace')->assertJsonMissingPath('exception');
    }

    public function test_failed_logins_are_throttled(): void
    {
        $payload = ['email' => 'unknown@example.test', 'password' => 'wrong-password'];
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', $payload)->assertUnprocessable();
        }
        $this->postJson('/api/login', $payload)->assertStatus(429)->assertHeader('Retry-After');
    }

    public function test_registration_is_throttled(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/register', [])->assertUnprocessable();
        }
        $this->postJson('/api/register', [])->assertStatus(429);
    }

    public function test_malformed_login_email_returns_validation_error(): void
    {
        $this->postJson('/api/login', ['email' => ['invalid'], 'password' => 'password123'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_authenticated_api_is_throttled(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        for ($attempt = 0; $attempt < 120; $attempt++) {
            $this->withToken($token)->getJson('/api/user')->assertOk();
        }
        $this->withToken($token)->getJson('/api/user')->assertStatus(429);
    }

    public function test_password_change_revokes_all_tokens_and_requires_reauthentication(): void
    {
        $user = User::factory()->create();
        $first = $user->createToken('first')->plainTextToken;
        $second = $user->createToken('second')->plainTextToken;
        $this->withToken($first)->putJson('/api/user', [
            'current_password' => 'password', 'password' => 'new-password123',
        ])->assertOk()->assertJsonPath('reauthenticate', true);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertTrue(Hash::check('new-password123', $user->fresh()->password));
        foreach ([$first, $second] as $token) {
            $this->app['auth']->forgetGuards();
            $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
        }
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'new-password123'])->assertOk();
    }

    public function test_wrong_current_password_does_not_revoke_tokens(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $this->withToken($token)->putJson('/api/user', [
            'current_password' => 'wrong', 'password' => 'new-password123',
        ])->assertForbidden();
        $this->assertSame(1, $user->tokens()->count());
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_expired_tokens_are_rejected(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('expired');
        $token->accessToken->forceFill(['created_at' => now()->subMinutes(config('sanctum.expiration') + 1)])->save();
        $this->withToken($token->plainTextToken)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_logout_only_revokes_current_token(): void
    {
        $user = User::factory()->create();
        $first = $user->createToken('first')->plainTextToken;
        $second = $user->createToken('second')->plainTextToken;
        $this->withToken($first)->postJson('/api/logout')->assertOk();
        $this->assertSame(1, $user->tokens()->count());
        $this->app['auth']->forgetGuards();
        $this->withToken($first)->getJson('/api/user')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($second)->getJson('/api/user')->assertOk();
    }

    public function test_trusted_command_creates_analyst_with_hashed_password(): void
    {
        $this->artisan('healthguard:create-analyst')
            ->expectsQuestion('Name', 'Trusted Analyst')
            ->expectsQuestion('Email', 'trusted@example.test')
            ->expectsQuestion('Password (at least 8 characters)', 'secure-password123')
            ->expectsQuestion('Confirm password', 'secure-password123')
            ->expectsOutput('Analyst account created.')->assertSuccessful();
        $user = User::where('email', 'trusted@example.test')->firstOrFail();
        $this->assertSame('analyst', $user->role);
        $this->assertTrue(Hash::check('secure-password123', $user->password));
    }

    public function test_demo_seeder_still_creates_both_roles(): void
    {
        $this->seed();
        $this->assertDatabaseHas('users', ['email' => 'analyst@healthguard.com', 'role' => 'analyst']);
        $this->assertDatabaseHas('users', ['email' => 'client@healthguard.com', 'role' => 'client']);
    }
}
