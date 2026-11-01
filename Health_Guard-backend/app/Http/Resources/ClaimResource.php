<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClaimResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'claim_id' => $this->claim_id, 'user_id' => $this->user_id,
            'client_name' => $this->client_name, 'type' => $this->type, 'provider_name' => $this->provider_name,
            'amount' => $this->amount, 'approved_amount' => $this->approved_amount,
            'status' => $this->status->value, 'notes' => $this->notes, 'bpjs_number' => $this->bpjs_number,
            'patient_date_of_birth' => $this->patient_date_of_birth?->format('Y-m-d'),
            'service_date' => $this->service_date?->format('Y-m-d'), 'date_submitted' => $this->date_submitted,
            'updated_at' => $this->updated_at, 'assigned_to' => $this->assigned_to,
            'assigned_analyst' => $this->whenLoaded('assignedAnalyst', fn () => $this->assignedAnalyst ? [
                'id' => $this->assignedAnalyst->id, 'name' => $this->assignedAnalyst->name, 'role' => $this->assignedAnalyst->role,
            ] : null),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
            'sla_due_at' => $this->date_submitted?->copy()->addHours(config('healthguard.sla_hours'))->toISOString(),
        ];
    }
}
