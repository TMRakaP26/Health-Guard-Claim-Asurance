<?php
// Run only inside a disposable APP_ENV=testing backend, never the active deployment.
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Models\User;
use App\Models\Claim;
use App\Services\ClaimService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
if (!app()->environment('testing') || DB::getDriverName() !== 'mysql') {
    throw new RuntimeException('An isolated testing environment with MySQL is required.');
}
$mode=$argv[1]??'verify';
if ($mode==='create') {
    $claim=app(ClaimService::class)->create(User::findOrFail($argv[2]),['client_name'=>'Concurrent fixture','provider_name'=>'Fixture','type'=>'Fixture','amount'=>'100.25']);
    echo $claim->claim_id;exit;
}
if ($mode==='assign') {
    try {
        app(ClaimService::class)->assign(User::findOrFail($argv[2]),Claim::where('claim_id',$argv[3])->firstOrFail());
        echo 'assigned';
    } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
        if ($e->getStatusCode()!==409) throw $e;
        echo 'conflict';
    }
    exit;
}
function parallel(array $arguments): array {
    $processes=[];
    foreach($arguments as $args) {
        $process=proc_open(array_merge([PHP_BINARY,__FILE__],$args),[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
        if(!is_resource($process)) throw new RuntimeException('Worker failed to start.');
        fclose($pipes[0]);$processes[]=[$process,$pipes];
    }
    $outputs=[];
    foreach($processes as [$process,$pipes]) {
        $output=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);
        fclose($pipes[1]);fclose($pipes[2]);
        if(proc_close($process)!==0)throw new RuntimeException('Concurrency worker failed: '.$error);
        $outputs[]=trim($output);
    }
    return $outputs;
}
$users=[];
try {
    foreach(['client','analyst','analyst'] as $role) {
        $users[]=User::create(['name'=>'MySQL verification','email'=>bin2hex(random_bytes(12)).'@verification.example.test','role'=>$role,'password'=>Hash::make(bin2hex(random_bytes(20)))]);
    }
    $ids=parallel(array_fill(0,4,['create',(string)$users[0]->id]));
    if(count(array_unique($ids))!==4)throw new RuntimeException('Concurrent claim IDs were not unique.');
    $outcomes=parallel([['assign',(string)$users[1]->id,$ids[0]],['assign',(string)$users[2]->id,$ids[0]]]);
    sort($outcomes);
    if($outcomes!==['assigned','conflict'])throw new RuntimeException('Assignment did not have exactly one winner.');
    $claim=Claim::where('claim_id',$ids[0])->firstOrFail();
    if($claim->histories()->where('event','assigned')->count()!==1)throw new RuntimeException('Assignment history duplicated.');
    $plan=DB::select('EXPLAIN SELECT id FROM claims WHERE user_id = ? ORDER BY date_submitted DESC, id DESC LIMIT 20',[$users[0]->id]);
    $available=$plan[0]->possible_keys??'';
    if(!str_contains($available,'claims_user_id_date_submitted_index'))throw new RuntimeException('Expected owner/date index unavailable.');
    echo "PASS MySQL concurrent claim IDs, single-winner assignment, audit count, owner/date index availability.\n";
} finally {
    foreach($users as $user) {
        foreach($user->claims()->get() as $claim) {
            App\Models\Notification::where('claim_id',$claim->claim_id)->delete();
        }
        $user->delete();
    }
}
