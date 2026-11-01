<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\ProfilePhotoRequest;
use App\Http\Requests\ProfileRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $data = $request->validated();
        unset($data['password_confirmation']);
        $data['role'] = 'client';
        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);

        return response()->json(['user' => (new UserResource($user))->resolve(), 'token' => $user->createToken('api-token')->plainTextToken], 201);
    }

    public function login(LoginRequest $request, TwoFactorService $twoFactor)
    {
        $data = $request->validated();
        $user = User::where('email', $data['email'])->first();
        if (! $user || ! $user->is_active || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'The provided credentials are incorrect.']);
        }
        if ($user->two_factor_confirmed_at) {
            $twoFactor->verify($user, $data['two_factor_code'] ?? '');
        }

        return response()->json(['user' => (new UserResource($user))->resolve(), 'token' => $user->createToken('api-token')->plainTextToken]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json((new UserResource($request->user()))->resolve());
    }

    public function updateProfile(ProfileRequest $request)
    {
        $user = $request->user();
        $data = $request->validated();
        $changed = isset($data['password']);
        if ($changed && ! Hash::check($data['current_password'], $user->password)) {
            abort(403, 'Current password is incorrect.');
        }
        if ($changed) {
            $data['password'] = Hash::make($data['password']);
        }
        unset($data['current_password'], $data['password_confirmation']);
        if (isset($data['email']) && $data['email'] !== $user->email) {
            $user->email_verified_at = null;
        }
        DB::transaction(function () use ($user, $data, $changed) {
            $user->fill($data)->save();
            if ($changed) {
                $user->tokens()->delete();
            }
        });

        return response()->json(['user' => (new UserResource($user->fresh()))->resolve(), 'reauthenticate' => $changed, 'message' => 'Profile updated successfully']);
    }

    public function uploadProfilePhoto(ProfilePhotoRequest $request)
    {
        $user = $request->user();
        $old = $user->profile_photo;
        $path = $request->file('photo')->store('profile-photos', 'public');
        abort_unless($path, 503, 'Photo storage unavailable.');
        try {
            $user->update(['profile_photo' => $path]);
        } catch (\Throwable $error) {
            Storage::disk('public')->delete($path);
            throw $error;
        }
        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return response()->json(['user' => (new UserResource($user->fresh()))->resolve(), 'message' => 'Profile photo updated successfully']);
    }

    public function removeProfilePhoto(Request $request)
    {
        $user = $request->user();
        $old = $user->profile_photo;
        $user->update(['profile_photo' => null]);
        if ($old) {
            Storage::disk('public')->delete($old);
        }

        return response()->json(['user' => (new UserResource($user->fresh()))->resolve(), 'message' => 'Profile photo removed']);
    }
}
