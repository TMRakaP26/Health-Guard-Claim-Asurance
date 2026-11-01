<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ClaimPayment extends Model {
    protected $guarded = ['id'];
    protected function casts(): array { return ['amount' => 'decimal:2', 'paid_at' => 'datetime', 'settled_at' => 'datetime']; }
}
