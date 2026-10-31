<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

class SafeUpload implements ValidationRule
{
    public function __construct(private bool $imagesOnly = false) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $types = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png'];
        if (! $this->imagesOnly) {
            $types['pdf'] = 'application/pdf';
        }

        if (! $value instanceof UploadedFile || ! $value->isValid() || $value->getSize() < 1) {
            $fail('The :attribute must be a non-empty uploaded file.');

            return;
        }

        $extension = strtolower($value->getClientOriginalExtension());
        if (! isset($types[$extension]) || $types[$extension] !== $value->getMimeType()) {
            $fail('The :attribute contents must match its PDF, JPG, JPEG, or PNG extension.');
        }
    }
}
