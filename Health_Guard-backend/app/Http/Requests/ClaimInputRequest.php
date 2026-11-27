<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClaimInputRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isClient() ?? false;
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        $rules = [
            'client_name' => "$required|string|max:255", 'type' => "$required|string|max:255",
            'disease_name' => 'sometimes|nullable|string|max:255',
            'description' => 'sometimes|nullable|string|max:4000',
            'provider_name' => "$required|string|max:255",
            'amount' => [$required, 'numeric', 'decimal:0,2', 'gt:0', 'max:'.config('healthguard.max_amount')],
            'bpjs_number' => 'sometimes|nullable|string|max:30',
            'patient_date_of_birth' => 'sometimes|nullable|date_format:Y-m-d|before_or_equal:today',
            'service_date' => 'sometimes|nullable|date_format:Y-m-d|before_or_equal:today',
        ];

        if ($this->isMethod('POST')) {
            // Submission replay protection; ignored by resubmission.
            $rules['submission_key'] = 'sometimes|nullable|string|min:8|max:64';
            $rules['draft_id'] = 'sometimes|nullable|integer|min:1';
        }

        return $rules;
    }
}
