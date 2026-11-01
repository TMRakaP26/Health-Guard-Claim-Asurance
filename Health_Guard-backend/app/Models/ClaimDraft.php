<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ClaimDraft extends Model { protected $guarded = ['id']; protected function casts(): array { return ['data' => 'array']; } }
