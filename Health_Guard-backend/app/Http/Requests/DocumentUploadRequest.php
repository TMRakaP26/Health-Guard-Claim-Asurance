<?php
namespace App\Http\Requests;
use App\Models\Claim;
use App\Rules\SafeUpload;
use Illuminate\Foundation\Http\FormRequest;
class DocumentUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('uploadDocument', Claim::where('claim_id', $this->route('claimId'))->firstOrFail()) ?? false;
    }
    public function rules(): array
    {
        return ['file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240', new SafeUpload],
            'request_id' => 'sometimes|nullable|integer', 'message_id' => 'sometimes|nullable|integer'];
    }
}
