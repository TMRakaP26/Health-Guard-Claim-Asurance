<?php

namespace App\Services;

use App\Models\Claim;
use App\Models\ClaimHistory;
use App\Models\User;

class ClaimHistoryService
{
    public function record(Claim $claim, ?User $actor, string $event, ?string $from, ?string $to, ?string $notes = null, ?string $amount = null, array $metadata = []): ClaimHistory
    {
        return $claim->histories()->create([
            'actor_id' => $actor?->id, 'event' => $event, 'from_status' => $from,
            'to_status' => $to, 'notes' => $notes, 'approved_amount' => $amount,
            'metadata' => $metadata,
        ]);
    }
}
