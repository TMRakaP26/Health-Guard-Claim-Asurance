<?php

namespace App\Http\Requests;

use App\Enums\ClaimStatus;
use App\Models\Claim;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClaimDecisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('decide', Claim::where('claim_id', $this->route('id'))->firstOrFail()) ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(ClaimStatus::class)],
            'notes' => ['nullable', 'string', 'max:4000', Rule::requiredIf(in_array($this->input('status'), ['Rejected', 'Needs Info'], true))],
            'approved_amount' => ['nullable', 'numeric', 'decimal:0,2', 'gt:0',
                'max:'.Claim::where('claim_id', $this->route('id'))->firstOrFail()->amount,
                Rule::requiredIf($this->input('status') === 'Partially Approved')],
        ];
    }
}
