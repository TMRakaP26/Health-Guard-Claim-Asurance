<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

class SafeUpload implements ValidationRule
{
    /**
     * MIME types finfo may report for each accepted extension. DOC/DOCX are ZIP
     * and OLE container formats, so finfo reports their container type rather
     * than a Word-specific one on most platforms.
     */
    private const MIMES = [
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'pdf' => ['application/pdf'],
        'doc' => ['application/msword', 'application/vnd.ms-office', 'application/x-ole-storage', 'application/cdfv2', 'application/octet-stream'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
    ];

    /** Leading bytes that each container format must have. */
    private const SIGNATURES = [
        'jpg' => "\xFF\xD8\xFF",
        'jpeg' => "\xFF\xD8\xFF",
        'png' => "\x89PNG\r\n\x1a\n",
        'pdf' => '%PDF-',
        'doc' => "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1",
        'docx' => "PK\x03\x04",
    ];

    public function __construct(private bool $imagesOnly = false) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid() || $value->getSize() < 1) {
            $fail('The :attribute must be a non-empty uploaded file.');

            return;
        }

        $extension = strtolower($value->getClientOriginalExtension());
        $allowed = $this->imagesOnly ? array_intersect_key(self::MIMES, array_flip(['jpg', 'jpeg', 'png'])) : self::MIMES;

        if (! isset($allowed[$extension])
            || ! in_array($value->getMimeType(), $allowed[$extension], true)
            || ! $this->contentsMatch($extension, $value)) {
            // The rejection must list only the formats this caller accepts, or a
            // profile photo upload is told that a Word document is acceptable.
            $fail($this->imagesOnly
                ? 'The :attribute contents must match its JPG, JPEG, or PNG extension.'
                : 'The :attribute contents must match its PDF, JPG, JPEG, PNG, DOC, or DOCX extension.');
        }
    }

    /**
     * Validate the bytes themselves. MIME detection alone cannot separate a
     * legacy DOC from any other OLE container, so DOC requires the compound
     * file signature and DOCX must be a ZIP that actually carries a Word part.
     */
    private function contentsMatch(string $extension, UploadedFile $file): bool
    {
        $path = $file->getRealPath();
        $handle = $path === false ? false : fopen($path, 'rb');
        if ($handle === false) {
            return false;
        }
        $head = (string) fread($handle, 8);
        fclose($handle);

        $signature = self::SIGNATURES[$extension] ?? null;
        if ($signature === null || ! str_starts_with($head, $signature)) {
            return false;
        }

        if ($extension !== 'docx') {
            return true;
        }

        $bytes = file_get_contents($path);

        return $bytes !== false
            && str_contains($bytes, 'word/document.xml')
            && str_contains($bytes, '[Content_Types].xml');
    }
}
