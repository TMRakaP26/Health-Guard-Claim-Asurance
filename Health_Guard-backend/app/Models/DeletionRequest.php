<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DeletionRequest extends Model {
    protected $guarded = ['id'];
    protected function casts(): array { return ['reviewed_at' => 'datetime']; }
}
