<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Rules\SafeUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'sometimes|string|max:255|unique:users,username',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'sometimes|string|in:client',
            'phone' => 'sometimes|string|max:20',
            'address' => 'sometimes|string|max:1000',
            'date_of_birth' => 'sometimes|date',
            'bpjs_number' => 'sometimes|string|max:30',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'] ?? null,
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'client',
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'bpjs_number' => $validated['bpjs_number'] ?? null,
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $rules = [
            'name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|max:255|unique:users,username,'.$user->id,
            'email' => 'sometimes|string|email|max:255|unique:users,email,'.$user->id,
            'phone' => 'sometimes|string|max:20',
            'address' => 'sometimes|string|max:1000',
            'date_of_birth' => 'sometimes|date',
            'bpjs_number' => 'sometimes|string|max:30',
        ];

        // If password is being changed, require current_password
        if ($request->has('password')) {
            $rules['current_password'] = 'required|string';
            $rules['password'] = 'required|string|min:8';
        }

        $validated = $request->validate($rules);

        // Verify current password if trying to change password
        if (isset($validated['password'])) {
            if (! Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['message' => 'Current password is incorrect.'], 403);
            }
            $validated['password'] = Hash::make($validated['password']);
            unset($validated['current_password']);
        }

        $passwordChanged = isset($validated['password']);
        DB::transaction(function () use ($user, $validated, $passwordChanged) {
            $user->update($validated);
            if ($passwordChanged) {
                $user->tokens()->delete();
            }
        });

        return response()->json([
            'user' => $user->fresh(),
            'message' => $passwordChanged ? 'Password updated. Please sign in again.' : 'Profile updated successfully',
            'reauthenticate' => $passwordChanged,
        ]);
    }

    public function uploadProfilePhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048', new SafeUpload(imagesOnly: true)],
        ]);

        $user = $request->user();

        // Delete old photo if exists
        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
        }

        $file = $request->file('photo');
        $path = $file->store('profile-photos', 'public');

        $user->update(['profile_photo' => $path]);

        return response()->json([
            'user' => $user->fresh(),
            'message' => 'Profile photo updated successfully',
        ]);
    }

    public function removeProfilePhoto(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
        }

        $user->update(['profile_photo' => null]);

        return response()->json([
            'user' => $user->fresh(),
            'message' => 'Profile photo removed',
        ]);
    }
}
