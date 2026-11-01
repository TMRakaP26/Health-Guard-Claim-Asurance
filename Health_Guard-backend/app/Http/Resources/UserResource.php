<?php
namespace App\Http\Resources;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'email' => $this->email, 'role' => $this->role,
            'username' => $this->username, 'phone' => $this->phone, 'address' => $this->address,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'), 'bpjs_number' => $this->bpjs_number,
            'profile_photo' => $this->profile_photo, 'email_verified_at' => $this->email_verified_at,
            'two_factor_enabled' => (bool) $this->two_factor_confirmed_at, 'is_active' => $this->is_active ?? true,
        ];
    }
}
