<?php

namespace Tests\Feature;

use App\Models\Claim;
use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SecurityUploadTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';

    private Claim $claim;

    private array $uploadPaths = [];

    protected function tearDown(): void
    {
        foreach ($this->uploadPaths as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }
        parent::tearDown();
    }

    private function upload(string $name, string $content): UploadedFile
    {
        // Real UploadedFile detects MIME from bytes. Laravel's fake defaults to the
        // filename extension, which cannot exercise MIME spoofing protection.
        $path = tempnam(sys_get_temp_dir(), 'healthguard-upload-');
        $this->uploadPaths[] = $path;
        file_put_contents($path, $content);

        return new UploadedFile($path, $name, 'application/octet-stream', null, true);
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('private');
        Storage::fake('public');
        $owner = User::factory()->create(['role' => 'client']);
        Sanctum::actingAs($owner);
        $this->claim = Claim::create([
            'user_id' => $owner->id, 'claim_id' => 'CLM-2026-001', 'client_name' => 'Client',
            'provider_name' => 'Provider', 'type' => 'Consultation', 'amount' => 100,
            'status' => 'Pending', 'date_submitted' => now(),
        ]);
    }

    public static function invalidDocuments(): array
    {
        return [
            'disallowed executable' => ['file.exe', 'MZexecutable', 0],
            'pdf with executable extension' => ['file.exe', '%PDF-1.4 test', 0],
            'spoofed pdf MIME' => ['file.pdf', 'this is plain text', 0],
            'png content with pdf extension' => ['file.pdf', 'PNG', 0],
            'empty file' => ['empty.pdf', '', 0],
            'one byte above 10 MB' => ['large.pdf', '%PDF-1.4 test', 10 * 1024 * 1024 + 1],
        ];
    }

    #[DataProvider('invalidDocuments')]
    public function test_invalid_documents_are_rejected(string $name, string $content, int $bytes): void
    {
        if ($content === 'PNG') {
            $content = base64_decode(self::PNG);
        }
        if ($bytes) {
            $content = str_pad($content, $bytes, ' ');
        }
        $file = $this->upload($name, $content);
        $this->postJson('/api/claims/CLM-2026-001/documents', ['file' => $file])
            ->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertSame(0, Document::count());
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public static function validDocuments(): array
    {
        return ['PDF' => ['evidence.pdf', '%PDF-1.4 test'], 'PNG' => ['evidence.png', 'PNG']];
    }

    #[DataProvider('validDocuments')]
    public function test_valid_documents_are_private_and_downloadable(string $name, string $content): void
    {
        $content = $content === 'PNG' ? base64_decode(self::PNG) : $content;
        $response = $this->postJson('/api/claims/CLM-2026-001/documents', [
            'file' => $this->upload($name, $content),
        ])->assertCreated();
        $path = $response->json('file_path');
        Storage::disk('private')->assertExists($path);
        Storage::disk('public')->assertMissing($path);
        $this->assertNotSame('documents/'.$name, $path);
        $this->getJson('/api/claims/CLM-2026-001/documents/'.$response->json('id').'/download')
            ->assertOk()->assertStreamedContent($content);
    }

    public function test_exact_document_size_limit_is_accepted(): void
    {
        $this->postJson('/api/claims/CLM-2026-001/documents', [
            'file' => $this->upload('limit.pdf', str_pad('%PDF-1.4 test', 10 * 1024 * 1024, ' ')),
        ])->assertCreated();
    }

    public static function invalidPhotos(): array
    {
        return [
            'empty' => ['photo.png', '', 0],
            'spoofed MIME' => ['photo.jpg', 'plain text', 0],
            'mismatched extension' => ['photo.jpg', 'PNG', 0],
            'GIF' => ['photo.gif', 'GIF89a', 0],
            'WebP' => ['photo.webp', 'RIFF0000WEBP', 0],
            'one byte above 2 MB' => ['photo.png', 'PNG', 2 * 1024 * 1024 + 1],
        ];
    }

    #[DataProvider('invalidPhotos')]
    public function test_invalid_profile_photos_are_rejected(string $name, string $content, int $bytes): void
    {
        $content = $content === 'PNG' ? base64_decode(self::PNG) : $content;
        if ($bytes) {
            $content = str_pad($content, $bytes, ' ');
        }
        $this->postJson('/api/user/photo', ['photo' => $this->upload($name, $content)])
            ->assertUnprocessable()->assertJsonValidationErrors('photo');
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_valid_profile_photo_remains_public(): void
    {
        $response = $this->postJson('/api/user/photo', [
            'photo' => $this->upload('photo.png', base64_decode(self::PNG)),
        ])->assertOk();
        Storage::disk('public')->assertExists($response->json('user.profile_photo'));
    }

    public function test_legacy_document_migration_preserves_bytes_and_is_idempotent(): void
    {
        $document = $this->legacyDocument();
        $content = '%PDF-1.4 legacy';
        Storage::disk('public')->put($document->file_path, $content);
        $this->artisan('healthguard:privatize-documents')->assertSuccessful();
        $this->artisan('healthguard:privatize-documents')->assertSuccessful();
        Storage::disk('public')->assertMissing($document->file_path);
        $this->assertSame($content, Storage::disk('private')->get($document->file_path));
        $this->assertSame($document->file_path, $document->fresh()->file_path);
        $this->getJson("/api/claims/CLM-2026-001/documents/{$document->id}/download")
            ->assertOk()->assertStreamedContent($content);
    }

    public function test_migration_preserves_source_when_target_conflicts(): void
    {
        $document = $this->legacyDocument();
        Storage::disk('public')->put($document->file_path, 'original');
        Storage::disk('private')->put($document->file_path, 'different');
        $this->artisan('healthguard:privatize-documents')->assertFailed();
        $this->assertSame('original', Storage::disk('public')->get($document->file_path));
        $this->assertSame('different', Storage::disk('private')->get($document->file_path));
    }

    public function test_missing_legacy_file_makes_migration_fail(): void
    {
        $this->legacyDocument();
        $this->artisan('healthguard:privatize-documents')->assertFailed();
    }

    public function test_migration_refuses_unexpected_paths(): void
    {
        $document = $this->legacyDocument();
        $document->update(['file_path' => 'profile-photos/photo.png']);
        Storage::disk('public')->put('profile-photos/photo.png', base64_decode(self::PNG));
        $this->artisan('healthguard:privatize-documents')->assertFailed();
        Storage::disk('public')->assertExists('profile-photos/photo.png');
        Storage::disk('private')->assertMissing('profile-photos/photo.png');
    }

    private function legacyDocument(): Document
    {
        return $this->claim->documents()->create([
            'file_name' => 'legacy.pdf', 'file_path' => 'documents/legacy.pdf',
            'file_size' => 15, 'mime_type' => 'application/pdf',
        ]);
    }
}
