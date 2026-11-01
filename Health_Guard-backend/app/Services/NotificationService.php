<?php
namespace App\Services;
use App\Models\Claim;
use App\Models\Notification;
use App\Models\User;
class NotificationService
{
    public function send(User $user, ?Claim $claim, string $type, string $title, string $body): Notification
    {
        $notification = Notification::create(['user_id' => $user->id, 'claim_id' => $claim?->claim_id,
            'type' => $type, 'title' => $title, 'body' => $body]);
        if (app(MailService::class)->available() && $user->hasVerifiedEmail() && $user->is_active) {
            \Illuminate\Support\Facades\DB::afterCommit(function () use ($user, $notification) {
                try {
                    app(MailService::class)->send($user->email, 'HealthGuard notification', 'You have a new notification. Sign in to review it: '.config('healthguard.frontend_url'));
                } catch (\Throwable $exception) {
                    \Illuminate\Support\Facades\Log::warning('notification.email_failed', ['notification_id' => $notification->id]);
                }
            });
        }
        return $notification;
    }
}
