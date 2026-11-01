<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClaimHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'event' => $this->event, 'from_status' => $this->from_status,
            'to_status' => $this->to_status, 'notes' => $this->notes, 'approved_amount' => $this->approved_amount,
            'metadata' => $this->metadata, 'created_at' => $this->created_at,
            'actor' => $this->actor ? ['id' => $this->actor->id, 'name' => $this->actor->name, 'role' => $this->actor->role] : null];
    }
}
