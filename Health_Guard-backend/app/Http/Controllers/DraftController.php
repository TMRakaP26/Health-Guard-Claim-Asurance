<?php
namespace App\Http\Controllers;
use App\Models\ClaimDraft;
use Illuminate\Http\Request;
class DraftController extends Controller {
    public function index(Request $request) {
        return response()->json(ClaimDraft::where('user_id',$request->user()->id)->orderByDesc('updated_at')->get());
    }
    public function save(Request $request, ?int $id = null) {
        $data = $request->validate(['data'=>'required|array:client_name,type,provider_name,amount,bpjs_number,patient_date_of_birth,service_date,step',
            'data.client_name'=>'nullable|string|max:255','data.type'=>'nullable|string|max:255','data.provider_name'=>'nullable|string|max:255',
            'data.amount'=>'nullable|numeric|min:0|max:'.config('healthguard.max_amount'),'data.bpjs_number'=>'nullable|string|max:30',
            'data.patient_date_of_birth'=>'nullable|date_format:Y-m-d','data.service_date'=>'nullable|date_format:Y-m-d','data.step'=>'nullable|integer|min:1|max:4']);
        $draft = $id ? ClaimDraft::where('user_id',$request->user()->id)->findOrFail($id) : new ClaimDraft(['user_id'=>$request->user()->id]);
        $draft->fill($data)->save(); return response()->json($draft,$id ? 200 : 201);
    }
    public function destroy(Request $request, int $id) {
        ClaimDraft::where('user_id',$request->user()->id)->findOrFail($id)->delete();
        return response()->json(['message'=>'Draft deleted']);
    }
}
