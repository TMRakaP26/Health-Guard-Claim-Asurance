<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\MailService;
use App\Services\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    public function forgot(Request $request, MailService $mail)
    {
        $data = $request->validate(['email' => 'required|email|max:255']);
        $mail->requireAvailable();
        Password::sendResetLink(['email' => strtolower($data['email'])]);

        return response()->json(['message' => 'If this account exists, a password reset email will be sent.']);
    }

    public function reset(Request $request)
    {
        $data = $request->validate(['email' => 'required|email|max:255', 'token' => 'required|string|max:255', 'password' => 'required|string|min:8|max:128|confirmed']);
        $status = Password::reset($data, function (User $user, string $password) {
            DB::transaction(function () use ($user, $password) {
                $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
                $user->tokens()->delete();
            });
        });
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'This password reset link is invalid or expired.']);
        }

        return response()->json(['message' => 'Password reset. Sign in again.']);
    }

    public function sendVerification(Request $request, MailService $mail)
    {
        $mail->requireAvailable();
        if (! $request->user()->hasVerifiedEmail()) {
            $request->user()->sendEmailVerificationNotification();
        }

        return response()->json(['message' => 'Verification email requested.']);
    }

    public function verify(Request $request, string $id, string $hash)
    {
        abort_unless((string) $request->user()->id === $id && hash_equals(sha1($request->user()->getEmailForVerification()), $hash), 403);
        $request->user()->markEmailAsVerified();

        return response()->json(['message' => 'Email verified.']);
    }

    public function setupTwoFactor(Request $request, TwoFactorService $totp)
    {
        abort_unless($request->user()->isAnalyst() || $request->user()->isAdmin(), 403);
        $data = $request->validate(['password' => 'required|string']);
        abort_unless(Hash::check($data['password'], $request->user()->password), 403, 'Incorrect password.');
        abort_if($request->user()->two_factor_confirmed_at, 409, 'Two-factor authentication is already enabled.');
        $secret = $totp->secret();
        $request->user()->update(['two_factor_secret' => $secret, 'two_factor_last_counter' => null, 'two_factor_recovery_codes' => null]);

        return response()->json(['secret' => $secret, 'uri' => 'otpauth://totp/'.rawurlencode('HealthGuard:'.$request->user()->email).'?secret='.$secret.'&issuer=HealthGuard&algorithm=SHA1&digits=6&period=30'])
            ->header('Cache-Control', 'no-store');
    }

    public function confirmTwoFactor(Request $request, TwoFactorService $totp)
    {
        $data = $request->validate(['code' => 'required|string|size:6']);
        abort_if($request->user()->two_factor_confirmed_at, 409, 'Already enabled.');
        $totp->verify($request->user(), $data['code'], false);
        $codes = array_map(fn () => bin2hex(random_bytes(10)), range(1, 8));
        $request->user()->update(['two_factor_confirmed_at' => now(), 'two_factor_recovery_codes' => array_map(fn ($code) => hash('sha256', $code), $codes)]);

        return response()->json(['recovery_codes' => $codes])->header('Cache-Control', 'no-store');
    }

    public function disableTwoFactor(Request $request, TwoFactorService $totp)
    {
        $data = $request->validate(['password' => 'required|string', 'code' => 'required|string']);
        abort_unless(Hash::check($data['password'], $request->user()->password), 403);
        $totp->verify($request->user(), $data['code']);
        $request->user()->update(['two_factor_secret' => null, 'two_factor_confirmed_at' => null, 'two_factor_recovery_codes' => null, 'two_factor_last_counter' => null]);
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Two-factor authentication disabled. Sign in again.', 'reauthenticate' => true]);
    }

    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['reauthenticate' => true, 'message' => 'All sessions revoked.']);
    }
}
