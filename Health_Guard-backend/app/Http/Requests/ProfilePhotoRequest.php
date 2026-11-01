<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use App\Rules\SafeUpload;
class ProfilePhotoRequest extends FormRequest {
    public function authorize(): bool { return (bool) $this->user(); }
    public function rules(): array { return ['photo' => ['required','image','mimes:jpg,jpeg,png','max:2048',new SafeUpload(imagesOnly:true)]]; }
}
