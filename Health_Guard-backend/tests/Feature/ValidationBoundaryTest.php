<?php

namespace Tests\Feature;

use App\Models\Claim;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ValidationBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public static function registrationCases(): iterable
    {
        foreach (['name', 'email', 'password'] as $field) {
            yield "$field missing" => [$field, null, false, true];
            yield "$field empty" => [$field, '', false, false];
        }
        yield 'name whitespace' => ['name', '   ', false, false];
        yield 'name 255' => ['name', str_repeat('a', 255), true, false];
        yield 'name 256' => ['name', str_repeat('a', 256), false, false];
        yield 'email malformed' => ['email', 'invalid', false, false];
        yield 'email mixed case' => ['email', 'Mixed@Example.Test', true, false];
        yield 'email too long' => ['email', str_repeat('a', 245).'@example.test', false, false];
        yield 'email 254' => ['email', str_repeat('a', 64).'@'.str_repeat('b', 63).'.'.str_repeat('c', 63).'.'.str_repeat('d', 57).'.com', true, false];
        yield 'email 256' => ['email', str_repeat('a', 64).'@'.str_repeat('b', 63).'.'.str_repeat('c', 63).'.'.str_repeat('d', 59).'.com', false, false];
        yield 'password 7' => ['password', '1234567', false, false];
        yield 'password 8' => ['password', '12345678', true, false];
        yield 'confirmation mismatch' => ['password_confirmation', 'different', false, false];
        yield 'client role' => ['role', 'client', true, false];
        yield 'analyst role' => ['role', 'analyst', false, false];
        yield 'omitted role' => ['role', null, true, true];
    }

    #[DataProvider('registrationCases')]
    public function test_registration_boundaries(string $field, mixed $value, bool $valid, bool $omit): void
    {
        Cache::flush();
        $payload = ['name' => 'Patient', 'email' => 'patient@example.test', 'password' => 'password123'];
        if ($omit) {
            unset($payload[$field]);
        } else {
            $payload[$field] = $value;
        }
        $response = $this->postJson('/api/register', $payload);
        if ($valid) {
            $response->assertCreated();
            $this->assertDatabaseHas('users', ['email' => strtolower($payload['email']), 'role' => 'client']);
        } else {
            $response->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->assertDatabaseCount('users', 0);
        }
    }

    public static function claimCases(): iterable
    {
        foreach (['client_name', 'provider_name', 'type'] as $field) {
            yield "$field missing" => [$field, null, false, true];
            yield "$field empty" => [$field, '', false, false];
            yield "$field whitespace" => [$field, '   ', false, false];
            yield "$field 255" => [$field, str_repeat('a', 255), true, false];
            yield "$field 256" => [$field, str_repeat('a', 256), false, false];
        }
        foreach ([0, -1, 'abc', '100000000', '1.001'] as $value) {
            yield "invalid amount $value" => ['amount', $value, false, false];
        }
        yield 'amount missing' => ['amount', null, false, true];
        yield 'amount minimum' => ['amount', '0.01', true, false];
        yield 'amount decimal' => ['amount', '100.50', true, false];
        yield 'amount maximum' => ['amount', '99999999.99', true, false];
        yield 'bpjs missing' => ['bpjs_number', null, true, true];
        yield 'bpjs empty' => ['bpjs_number', '', true, false];
        yield 'bpjs 30' => ['bpjs_number', str_repeat('1', 30), true, false];
        yield 'bpjs 31' => ['bpjs_number', str_repeat('1', 31), false, false];
    }

    public function test_duplicate_email_is_rejected_after_normalization(): void
    {
        Cache::flush();
        User::factory()->create(['email' => 'patient@example.test']);
        $this->postJson('/api/register', ['name' => 'Patient', 'email' => 'PATIENT@EXAMPLE.TEST', 'password' => 'password123'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertDatabaseCount('users', 1);
    }

    public static function decisionCases(): iterable
    {
        foreach (['Pending', 'Approved', 'Rejected', 'Needs Info', 'Partially Approved'] as $status) {
            yield $status => [['status' => $status, 'notes' => 'Reviewed', 'approved_amount' => 50], null];
        }
        foreach (['', 'approved', 'unknown'] as $status) {
            yield "invalid status $status" => [['status' => $status], 'status'];
        }
        yield 'missing status' => [[], 'status'];
        foreach ([null, '', -1, 0, 501, 'abc', '1.001'] as $index => $amount) {
            yield "partial amount $index" => [['status' => 'Partially Approved', 'approved_amount' => $amount], 'approved_amount'];
        }
        yield 'missing partial amount' => [['status' => 'Partially Approved'], 'approved_amount'];
        yield 'partial amount minimum' => [['status' => 'Partially Approved', 'approved_amount' => '0.01'], null];
        yield 'partial equals billed' => [['status' => 'Partially Approved', 'approved_amount' => '500.00'], null];
        foreach ([null, '', 'Ordinary note', str_repeat('a', 4000)] as $index => $notes) {
            yield "optional notes $index" => [['status' => 'Approved', 'notes' => $notes], null];
        }
        yield 'notes too long' => [['status' => 'Approved', 'notes' => str_repeat('a', 4001)], 'notes'];
        foreach (['Rejected', 'Needs Info'] as $status) {
            foreach ([null, '', '   '] as $index => $notes) {
                yield "$status requires notes $index" => [['status' => $status, 'notes' => $notes], 'notes'];
            }
        }
    }

    #[DataProvider('decisionCases')]
    public function test_decision_boundaries_do_not_mutate_on_failure(array $data, ?string $invalidField): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        $analyst = User::factory()->create(['role' => 'analyst']);
        $claim = Claim::create(['claim_id' => 'CLM-2026-001', 'user_id' => $owner->id, 'assigned_to' => $analyst->id,
            'client_name' => 'Patient', 'provider_name' => 'Hospital', 'type' => 'Consultation',
            'amount' => 500, 'status' => 'Pending', 'date_submitted' => now()]);
        Sanctum::actingAs($analyst);
        $response = $this->patchJson('/api/claims/'.$claim->claim_id.'/status', $data);
        if ($invalidField) {
            $response->assertUnprocessable()->assertJsonValidationErrors($invalidField);
            $this->assertSame('Pending', $claim->fresh()->status->value);
            $this->assertDatabaseCount('claim_histories', 0);
            $this->assertDatabaseCount('notifications', 0);
        } else {
            $response->assertOk()->assertJsonPath('status', $data['status']);
            $this->assertDatabaseCount('claim_histories', 1);
        }
    }

    public function test_unknown_and_malformed_claim_and_document_ids_return_not_found(): void
    {
        $owner = User::factory()->create(['role' => 'client']);
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/claims', ['client_name' => 'Patient', 'provider_name' => 'Hospital', 'type' => 'Consultation', 'amount' => 100])->assertCreated()->json('claim_id');
        foreach (['CLM-1900-999999', 'not-a-claim', '999999'] as $missing) {
            foreach (['', '/documents', '/history'] as $suffix) {
                $this->getJson('/api/claims/'.$missing.$suffix)->assertNotFound();
            }
        }
        foreach (['999999', 'invalid', '-1'] as $document) {
            $this->getJson('/api/claims/'.$id.'/documents/'.$document.'/download')->assertNotFound();
        }
    }

    #[DataProvider('claimCases')]
    public function test_claim_boundaries(string $field, mixed $value, bool $valid, bool $omit): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'client']));
        $payload = ['client_name' => 'Patient', 'provider_name' => 'Hospital', 'type' => 'Consultation', 'amount' => '100'];
        if ($omit) {
            unset($payload[$field]);
        } else {
            $payload[$field] = $value;
        }
        $response = $this->postJson('/api/claims', $payload);
        if ($valid) {
            $response->assertCreated();
            $this->assertDatabaseCount('claims', 1);
            $this->assertDatabaseCount('claim_histories', 1);
        } else {
            $response->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->assertDatabaseCount('claims', 0);
            $this->assertDatabaseCount('claim_histories', 0);
        }
    }

    public static function paginationCases(): iterable
    {
        yield 'default' => [null, true];
        foreach ([1, 100] as $value) {
            yield "valid $value" => [$value, true];
        }
        foreach ([0, 101, -1, 'abc'] as $value) {
            yield "invalid $value" => [$value, false];
        }
    }

    #[DataProvider('paginationCases')]
    public function test_pagination_boundaries(mixed $value, bool $valid): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'client']));
        $response = $this->getJson('/api/claims'.($value === null ? '' : '?per_page='.$value));
        if ($valid) {
            $response->assertOk();
        } else {
            $response->assertUnprocessable()->assertJsonValidationErrors('per_page');
        }
    }
}
