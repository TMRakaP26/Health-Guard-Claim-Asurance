<?php
namespace App\Services;
use App\Models\Claim;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
class RetentionService {
    public function deleteClaim(Claim $claim): void {
        // Delete bytes first; if storage fails, retain the database record for retry.
        foreach($claim->documents as $document) {
            Storage::disk('private')->delete($document->file_path);
            Storage::disk('public')->delete($document->file_path);
        }
        DB::transaction(function()use($claim){
            \App\Models\Notification::where('claim_id',$claim->claim_id)->delete();
            $claim->delete(); // Histories and child records cascade only during approved retention.
        });
    }
}
