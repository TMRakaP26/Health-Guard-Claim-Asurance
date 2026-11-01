<?php

namespace App\Http\Requests;

use App\Models\Claim;
use App\Rules\SafeUpload;
use Illuminate\Foundation\Http\FormRequest;

class DocumentUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        $claim = Claim::where('claim_id', $this->route('claimId'))->firstOrFail();

        return ($this->user()?->can('uploadDocument', $claim) ?? false)
            || ($this->filled('message_id') && ($this->user()?->can('decide', $claim) ?? false));
    }

    public function rules(): array
    {
        return ['file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240', new SafeUpload],
            'request_id' => 'sometimes|nullable|integer', 'message_id' => 'sometimes|nullable|integer'];
    }
}
