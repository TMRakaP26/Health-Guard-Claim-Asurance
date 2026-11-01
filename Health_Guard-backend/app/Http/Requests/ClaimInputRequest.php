<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class ClaimInputRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->isClient() ?? false; }
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';
        return [
            'client_name' => "$required|string|max:255", 'type' => "$required|string|max:255",
            'provider_name' => "$required|string|max:255",
            'amount' => [$required, 'numeric', 'decimal:0,2', 'gt:0', 'max:'.config('healthguard.max_amount')],
            'bpjs_number' => 'sometimes|nullable|string|max:30',
            'patient_date_of_birth' => 'sometimes|nullable|date_format:Y-m-d|before_or_equal:today',
            'service_date' => 'sometimes|nullable|date_format:Y-m-d|before_or_equal:today',
        ];
    }
}
