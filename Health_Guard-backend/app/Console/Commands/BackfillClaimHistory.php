<?php
namespace App\Console\Commands;
use App\Models\Claim;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
class BackfillClaimHistory extends Command {
    protected $signature = 'healthguard:backfill-history';
    protected $description = 'Add honest, idempotent history for legacy claims';
    public function handle(): int {
        $count = 0;
        foreach (Claim::orderBy('id')->lazyById() as $item) {
            DB::transaction(function () use ($item, &$count) {
                $claim = Claim::whereKey($item->id)->lockForUpdate()->firstOrFail();
                if ($claim->histories()->exists()) { return; }
                $claim->histories()->create(['actor_id' => $claim->user_id, 'event' => 'submitted',
                    'to_status' => 'Pending', 'created_at' => $claim->date_submitted, 'updated_at' => $claim->date_submitted,
                    'metadata' => ['backfilled' => true, 'original_details_unavailable' => true]]);
                $claim->histories()->create(['event' => 'migrated_snapshot', 'to_status' => $claim->status->value,
                    'notes' => $claim->notes, 'approved_amount' => $claim->approved_amount,
                    'metadata' => ['amount' => $claim->amount, 'assigned_to' => $claim->assigned_to]]);
                $count++;
            });
        }
        $this->info("Backfilled $count claims.");
        return self::SUCCESS;
    }
}
