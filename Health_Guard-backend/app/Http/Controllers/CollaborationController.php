<?php
namespace App\Http\Controllers;
use App\Models\Claim;
use App\Models\ClaimMessage;
use App\Models\ClaimDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Services\ClaimHistoryService;
use App\Services\ClaimService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
class CollaborationController extends Controller {
    private function claim(string $id): Claim {
        $claim = Claim::where('claim_id', $id)->firstOrFail(); Gate::authorize('view', $claim); return $claim;
    }
    public function messages(Request $request, string $id) {
        abort_unless(config('healthguard.features.messages'), 404);
        $claim = $this->claim($id); $request->validate(['page'=>'sometimes|integer|min:1','per_page'=>'sometimes|integer|min:1|max:100']);
        $page = $claim->messages()->with(['user','documents'])->orderByDesc('id')->paginate($request->integer('per_page', 20));
        return response()->json(array_merge($page->toArray(), ['data'=>$page->getCollection()->map(fn ($m)=>[
            'id'=>$m->id,'body'=>$m->body,'created_at'=>$m->created_at,
            'user'=>$m->user ? ['id'=>$m->user->id,'name'=>$m->user->name,'role'=>$m->user->role] : null,
            'documents'=>DocumentResource::collection($m->documents)->resolve(),
        ])]));
    }
    public function sendMessage(Request $request, string $id, NotificationService $notifications, ClaimHistoryService $history) {
        abort_unless(config('healthguard.features.messages'), 404);
        $claim = $this->claim($id);
        abort_unless($request->user()->can('update', $claim) || $request->user()->can('decide', $claim), 403);
        $data = $request->validate(['body'=>'required|string|max:4000']);
        $message = DB::transaction(function () use ($request,$claim,$data,$notifications,$history) {
            $message = $claim->messages()->create(['user_id'=>$request->user()->id,'body'=>$data['body']]);
            $recipient = $request->user()->id === $claim->user_id ? $claim->assignedAnalyst : $claim->user;
            if ($recipient) { $notifications->send($recipient,$claim,'claim_message','New claim message','There is a new message on your claim.'); }
            $history->record($claim,$request->user(),'message_added',$claim->status->value,$claim->status->value,metadata:['message_id'=>$message->id]);
            return $message;
        });
        return response()->json(['id'=>$message->id,'body'=>$message->body,'created_at'=>$message->created_at],201);
    }
    public function documentRequests(Request $request, string $id) {
        return response()->json($this->claim($id)->documentRequests()->orderByDesc('id')->get());
    }
    public function requestDocument(Request $request, string $id, ClaimService $claims, ClaimHistoryService $history) {
        $claim = $this->claim($id); Gate::authorize('decide',$claim);
        $data = $request->validate(['title'=>'required|string|max:255','instructions'=>'required|string|max:4000']);
        $result = DB::transaction(function () use ($request,$claim,$data,$claims,$history) {
            $claim = Claim::whereKey($claim->id)->lockForUpdate()->firstOrFail(); Gate::authorize('decide',$claim);
            $item = $claim->documentRequests()->create($data+['requested_by'=>$request->user()->id]);
            $claims->decide($request->user(),$claim,['status'=>'Needs Info','notes'=>$data['instructions']]);
            $history->record($claim,$request->user(),'document_requested',$claim->status->value,'Needs Info',metadata:['request_id'=>$item->id,'title'=>$item->title]);
            return $item;
        },5);
        return response()->json($result,201);
    }
}
