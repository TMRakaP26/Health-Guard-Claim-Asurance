<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class ProfileRequest extends FormRequest {
    public function authorize(): bool { return (bool) $this->user(); }
    protected function prepareForValidation(): void { if (is_string($this->email)) { $this->merge(['email' => strtolower(trim($this->email))]); } }
    public function rules(): array {
        return ['name' => 'sometimes|string|max:255', 'email' => ['sometimes','string','email','max:255',Rule::unique('users')->ignore($this->user()->id)],
            'username' => ['sometimes','nullable','string','max:255',Rule::unique('users')->ignore($this->user()->id)],
            'phone' => 'sometimes|nullable|string|max:20', 'address' => 'sometimes|nullable|string|max:1000',
            'date_of_birth' => 'sometimes|nullable|date_format:Y-m-d|before_or_equal:today', 'bpjs_number' => 'sometimes|nullable|string|max:30',
            'locale' => 'sometimes|in:id,en', 'password' => 'sometimes|string|min:8|max:128',
            'current_password' => 'required_with:password|string', 'password_confirmation' => 'sometimes|same:password'];
    }
}
