<?php

namespace App\Http\Requests;

use App\Rules\SafeUpload;
use Illuminate\Foundation\Http\FormRequest;

class ProfilePhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return ['photo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048', new SafeUpload(imagesOnly: true)]];
    }
}
