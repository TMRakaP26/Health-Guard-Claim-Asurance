<?php

namespace App\Services;

use App\Models\Claim;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class RetentionService
{
    public function deleteClaim(Claim $claim): void
    {
        DB::transaction(function () use ($claim) {
            $locked = Claim::whereKey($claim->id)->lockForUpdate()->firstOrFail();
            abort_if(in_array($locked->status->value, ['Pending', 'Needs Info'], true), 409, 'Resolve open claims before deletion.');
            foreach ($locked->documents as $document) {
                foreach (['private', 'public'] as $disk) {
                    if (Storage::disk($disk)->exists($document->file_path) && ! Storage::disk($disk)->delete($document->file_path)) {
                        throw new \RuntimeException('Document deletion failed; record retained for retry.');
                    }
                }
            }
            Notification::where('claim_id', $locked->claim_id)->delete();
            $locked->delete();
        }, 5);
    }
}
