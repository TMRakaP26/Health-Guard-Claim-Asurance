<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ClaimMessage extends Model {
    protected $guarded = ['id'];
    public function user() { return $this->belongsTo(User::class); }
    public function documents() { return $this->hasMany(Document::class, 'message_id'); }
}
