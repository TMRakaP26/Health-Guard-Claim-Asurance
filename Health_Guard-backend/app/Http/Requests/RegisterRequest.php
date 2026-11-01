<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class RegisterRequest extends FormRequest {
    public function authorize(): bool { return true; }
    protected function prepareForValidation(): void { if (is_string($this->email)) { $this->merge(['email' => strtolower(trim($this->email))]); } }
    public function rules(): array {
        return ['name' => 'required|string|max:255', 'email' => 'required|string|email|max:255|unique:users,email',
            'username' => 'sometimes|nullable|string|max:255|unique:users,username', 'password' => 'required|string|min:8|max:128',
            'password_confirmation' => 'sometimes|same:password', 'role' => 'sometimes|in:client',
            'phone' => 'sometimes|nullable|string|max:20', 'address' => 'sometimes|nullable|string|max:1000',
            'date_of_birth' => 'sometimes|nullable|date_format:Y-m-d|before_or_equal:today', 'bpjs_number' => 'sometimes|nullable|string|max:30'];
    }
}
