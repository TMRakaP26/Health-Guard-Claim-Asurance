<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TwoFactorService
{
    public function secret(): string
    {
        $bits = '';
        foreach (str_split(random_bytes(20)) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        foreach (str_split($bits, 5) as $chunk) {
            $secret .= $alphabet[bindec(str_pad($chunk, 5, '0'))];
        }

        return $secret;
    }

    public function code(string $secret, int $counter): string
    {
        $bits = '';
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        foreach (str_split($secret) as $letter) {
            $bits .= str_pad(decbin(strpos($alphabet, $letter)), 5, '0', STR_PAD_LEFT);
        }
        $key = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $key .= chr(bindec($byte));
            }
        }
        $hash = hash_hmac('sha1', pack('N2', intdiv($counter, 4294967296), $counter % 4294967296), $key, true);
        $offset = ord($hash[19]) & 15;
        $number = unpack('N', substr($hash, $offset, 4))[1] & 0x7FFFFFFF;

        return str_pad((string) ($number % 1000000), 6, '0', STR_PAD_LEFT);
    }

    public function verify(User $user, string $code, bool $allowRecovery = true): void
    {
        DB::transaction(function () use ($user, $code, $allowRecovery) {
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $counter = intdiv(now()->timestamp, 30);
            if ($locked->two_factor_secret && preg_match('/^\d{6}$/D', $code)) {
                for ($step = $counter - 1; $step <= $counter + 1; $step++) {
                    if ($step > ($locked->two_factor_last_counter ?? 0) && hash_equals($this->code($locked->two_factor_secret, $step), $code)) {
                        $locked->update(['two_factor_last_counter' => $step]);

                        return;
                    }
                }
            }
            if ($allowRecovery && $locked->two_factor_confirmed_at) {
                $codes = $locked->two_factor_recovery_codes ?? [];
                foreach ($codes as $index => $hash) {
                    if (hash_equals($hash, hash('sha256', $code))) {
                        unset($codes[$index]);
                        $locked->update(['two_factor_recovery_codes' => array_values($codes)]);

                        return;
                    }
                }
            }
            throw ValidationException::withMessages(['two_factor_code' => 'Enter a valid, unused authenticator or recovery code.']);
        }, 5);
    }
}
