<?php
namespace App\Http\Controllers;
use App\Models\DeletionRequest;
use App\Models\User;
use App\Services\RetentionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
class RetentionController extends Controller {
    public function index(Request $request) {
        $query=DeletionRequest::query();
        if(!$request->user()->isAdmin()){$query->where('user_id',$request->user()->id);}
        return response()->json($query->orderByDesc('id')->paginate(20));
    }
    public function request(Request $request) {
        $data=$request->validate(['reason'=>'nullable|string|max:2000']);
        abort_if(DeletionRequest::where('user_id',$request->user()->id)->where('status','pending')->exists(),409,'A request is already pending.');
        return response()->json(DeletionRequest::create($data+['user_id'=>$request->user()->id]),201);
    }
    public function review(Request $request,int $id,RetentionService $retention) {
        abort_unless($request->user()->isAdmin(),403);
        $data=$request->validate(['status'=>'required|in:approved,rejected','review_notes'=>'required|string|max:2000','confirm'=>'required|accepted']);
        $item=DeletionRequest::findOrFail($id); abort_unless($item->status==='pending',409,'Request already reviewed.');
        $user=User::find($item->user_id);
        abort_if($user?->isAdmin(),403,'Administrator deletion requires an operator.');
        if($data['status']==='approved' && $user) {
            abort_unless(config('healthguard.features.retention'),409,'Enable the approved retention policy before deleting data.');
            abort_if($user->claims()->whereIn('status',['Pending','Needs Info'])->exists(),409,'Resolve open claims before deletion.');
            foreach($user->claims()->with('documents')->get() as $claim){$retention->deleteClaim($claim);}
            if($user->profile_photo){Storage::disk('public')->delete($user->profile_photo);}
            $user->tokens()->delete(); $user->delete();
        }
        $item->update(['status'=>$data['status'],'review_notes'=>$data['review_notes'],'reviewed_at'=>now()]);
        return response()->json($item);
    }
}
