<?php

namespace App\Services;

use Illuminate\Support\Facades\Mail;

class MailService
{
    public function available(): bool
    {
        return config('healthguard.features.email') && config('mail.default') !== 'log';
    }

    public function requireAvailable(): void
    {
        abort_unless($this->available(), 503, 'Email delivery is not configured. Contact an administrator.');
    }

    public function send(string $email, string $subject, string $body): void
    {
        $this->requireAvailable();
        Mail::raw($body, fn ($message) => $message->to($email)->subject($subject));
    }
}
