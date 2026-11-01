<?php
require '/var/www/html/vendor/autoload.php';
$app=require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if(!app()->environment('testing')){throw new RuntimeException('Restore fixture is testing-only.');}
$email='restore-fixture@example.test';
$secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
if(($argv[1]??'')==='prepare'){
    App\Models\User::firstOrCreate(['email'=>$email],['name'=>'Restore fixture','role'=>'client','password'=>Illuminate\Support\Facades\Hash::make(bin2hex(random_bytes(24))),'two_factor_secret'=>$secret]);
    Illuminate\Support\Facades\Storage::disk('private')->put('restore-fixture.txt','HealthGuard restore fixture');
    echo "Restore fixture prepared.\n";
}else{
    $user=App\Models\User::where('email',$email)->firstOrFail();
    if($user->two_factor_secret!==$secret || Illuminate\Support\Facades\Storage::disk('private')->get('restore-fixture.txt')!=='HealthGuard restore fixture'){
        throw new RuntimeException('Restored encrypted record or storage file does not match.');
    }
    echo "Restored database, encryption key and file verified.\n";
}

