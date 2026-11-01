<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class ClaimHistory extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['metadata' => 'array', 'approved_amount' => 'decimal:2'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Claim history is immutable.'));
        static::deleting(fn () => throw new LogicException('Claim history is immutable; only a parent retention deletion may cascade.'));
    }

    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_id'); }
    public function claim(): BelongsTo { return $this->belongsTo(Claim::class); }
}
