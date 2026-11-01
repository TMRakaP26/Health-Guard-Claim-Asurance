<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ClaimDocumentRequest extends Model {
    protected $guarded = ['id'];
    protected function casts(): array { return ['fulfilled_at' => 'datetime']; }
}
