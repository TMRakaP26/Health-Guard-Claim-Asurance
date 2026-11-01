<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClaimCategory extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'coverage_limit' => 'decimal:2'];
    }
}
