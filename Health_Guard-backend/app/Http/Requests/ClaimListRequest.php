<?php
namespace App\Http\Requests;
use App\Enums\ClaimStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class ClaimListRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'q' => 'sometimes|nullable|string|max:255',
            'status' => ['sometimes', 'nullable', Rule::enum(ClaimStatus::class)],
            'date_from' => 'sometimes|nullable|date_format:Y-m-d',
            'date_to' => 'sometimes|nullable|date_format:Y-m-d|after_or_equal:date_from',
            'per_page' => 'sometimes|integer|min:1|max:100', 'page' => 'sometimes|integer|min:1',
            'sort' => ['sometimes', Rule::in(['newest', 'oldest', 'amount_desc', 'amount_asc'])],
            'scope' => ['sometimes', Rule::in(['all', 'unassigned', 'assigned'])],
        ];
    }
}
