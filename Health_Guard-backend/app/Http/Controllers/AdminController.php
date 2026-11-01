<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Models\Claim;
use App\Models\AnalystInvitation;
use App\Http\Resources\UserResource;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
class AdminController extends Controller {
    public function users(Request $request) {
        $request->validate(['page'=>'sometimes|integer|min:1','q'=>'sometimes|nullable|string|max:255']);
        $query=User::query()->withCount(['claims','assignments']);
        if($request->filled('q')) { $query->where(fn($q)=>$q->where('name','like','%'.$request->input('q').'%')->orWhere('email','like','%'.$request->input('q').'%')); }
        $page=$query->orderBy('id')->paginate(20);
        return response()->json(array_merge($page->toArray(),['data'=>$page->getCollection()->map(fn($u)=>array_merge((new UserResource($u))->resolve(),[
            'claims_count'=>$u->claims_count,'assignments_count'=>$u->assignments_count,
            'pending_assignments'=>Claim::where('assigned_to',$u->id)->where('status','Pending')->count(),
            'overdue_assignments'=>Claim::where('assigned_to',$u->id)->where('status','Pending')->where('date_submitted','<',now()->subHours(config('healthguard.sla_hours')))->count(),
        ]))]));
    }
    public function active(Request $request,int $id) {
        $data=$request->validate(['is_active'=>'required|boolean']);
        abort_if($id===$request->user()->id,409,'You cannot deactivate your own administrator account.');
        $user=User::findOrFail($id);
        abort_if($user->isAdmin(),403,'Administrator lifecycle must be managed through the trusted operator console.');
        DB::transaction(function()use($user,$data){ $user->update($data); if(!$data['is_active']){$user->tokens()->delete();} });
        return response()->json((new UserResource($user))->resolve());
    }
    public function invite(Request $request,MailService $mail) {
        $data=$request->validate(['email'=>'required|email|max:255|unique:users,email']);
        $email=strtolower($data['email']); $token=bin2hex(random_bytes(32));
        $invite=AnalystInvitation::create(['email'=>$email,'token_hash'=>hash('sha256',$token),'invited_by'=>$request->user()->id,'expires_at'=>now()->addDay()]);
        $url=rtrim(config('healthguard.frontend_url'),'/').'/accept-invitation?token='.$token;
        if($mail->available()){$mail->send($email,'HealthGuard analyst invitation',"An administrator invited you to HealthGuard. This link expires in 24 hours:\n".$url);}
        return response()->json(['id'=>$invite->id,'email'=>$email,'expires_at'=>$invite->expires_at,'invitation_url'=>$url],201)->header('Cache-Control','no-store');
    }
    public function accept(Request $request) {
        $data=$request->validate(['token'=>'required|string|size:64','name'=>'required|string|max:255','password'=>'required|string|min:8|max:128|confirmed']);
        $user=DB::transaction(function()use($data){
            $invite=AnalystInvitation::where('token_hash',hash('sha256',$data['token']))->lockForUpdate()->first();
            abort_unless($invite && !$invite->accepted_at && $invite->expires_at->isFuture(),422,'Invitation invalid or expired.');
            abort_if(User::where('email',$invite->email)->exists(),409,'This email already has an account.');
            $user=User::create(['name'=>$data['name'],'email'=>$invite->email,'password'=>Hash::make($data['password']),'role'=>'analyst']);
            $invite->update(['accepted_at'=>now()]); return $user;
        },5);
        return response()->json(['user'=>(new UserResource($user))->resolve(),'message'=>'Account created. Sign in and enable two-factor authentication.'],201);
    }
}
