<?php
namespace App\Console\Commands;
use App\Models\Claim;
use App\Services\RetentionService;
use Illuminate\Console\Command;
class PurgeExpiredClaims extends Command {
    protected $signature='healthguard:purge-expired {--apply : Actually apply the approved retention policy}';
    protected $description='Preview or apply configured retention for closed claims; disabled by default';
    public function handle(RetentionService $retention): int {
        $days=config('healthguard.retention_days');
        if(!config('healthguard.features.retention') || $days<1){$this->error('No approved retention policy is configured.');return self::FAILURE;}
        $claims=Claim::whereIn('status',['Approved','Rejected','Partially Approved'])->where('updated_at','<',now()->subDays($days));
        $this->info('Eligible claims: '.$claims->count());
        if($this->option('apply')){foreach($claims->with('documents')->lazyById() as $claim){$retention->deleteClaim($claim);}}
        else {$this->info('Dry run only. Use --apply after reviewing the retention policy and backup.');}
        return self::SUCCESS;
    }
}
