<?php
namespace App\Services;
use App\Models\Claim;
use App\Models\Notification;
use App\Models\User;
class NotificationService
{
    public function send(User $user, ?Claim $claim, string $type, string $title, string $body): Notification
    {
        return Notification::create(['user_id' => $user->id, 'claim_id' => $claim?->claim_id,
            'type' => $type, 'title' => $title, 'body' => $body]);
    }
}
