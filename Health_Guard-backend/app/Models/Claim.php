<?php

namespace App\Models;

use App\Enums\ClaimStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Claim extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'assigned_to',
        'claim_id',
        'client_name',
        'provider_name',
        'type',
        'amount',
        'status',
        'notes',
        'date_submitted',
        'approved_amount',
        'bpjs_number',
        'patient_date_of_birth',
        'service_date',
    ];

    protected function casts(): array
    {
        return [
            'status' => ClaimStatus::class,
            'patient_date_of_birth' => 'date:Y-m-d',
            'service_date' => 'date:Y-m-d',
            'amount' => 'decimal:2',
            'approved_amount' => 'decimal:2',
            'date_submitted' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedAnalyst(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(ClaimHistory::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ClaimPayment::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ClaimMessage::class);
    }

    public function documentRequests(): HasMany
    {
        return $this->hasMany(ClaimDocumentRequest::class);
    }
}
