<?php

namespace App\Http\Controllers;

use App\Models\DeletionRequest;
use App\Models\User;
use App\Services\RetentionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class RetentionController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['page' => 'sometimes|integer|min:1']);
        $query = DeletionRequest::query();
        if (! $request->user()->isAdmin()) {
            $query->where('user_id', $request->user()->id);
        }

        return response()->json($query->orderByDesc('id')->paginate(20));
    }

    public function request(Request $request)
    {
        $data = $request->validate(['reason' => 'nullable|string|max:2000']);
        $item = DB::transaction(function () use ($request, $data) {
            User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            abort_if(DeletionRequest::where('user_id', $request->user()->id)->where('status', 'pending')->exists(), 409, 'A request is already pending.');

            return DeletionRequest::create($data + ['user_id' => $request->user()->id]);
        }, 5);

        return response()->json($item, 201);
    }

    public function review(Request $request, int $id, RetentionService $retention)
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate(['status' => 'required|in:approved,rejected', 'review_notes' => 'required|string|max:2000', 'confirm' => 'required|accepted']);
        $item = DB::transaction(function () use ($id, $data, $retention) {
            $item = DeletionRequest::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($item->status === 'pending', 409, 'Request already reviewed.');
            $user = User::whereKey($item->user_id)->lockForUpdate()->first();
            abort_if($user?->isAdmin(), 403, 'Administrator deletion requires an operator.');
            if ($data['status'] === 'approved' && $user) {
                abort_unless(config('healthguard.features.retention'), 409, 'Enable the approved retention policy before deleting data.');
                $claims = $user->claims()->lockForUpdate()->get();
                abort_if($claims->contains(fn ($claim) => in_array($claim->status->value, ['Pending', 'Needs Info'], true)), 409, 'Resolve open claims before deletion.');
                foreach ($claims as $claim) {
                    $retention->deleteClaim($claim);
                }
                if ($user->profile_photo && Storage::disk('public')->exists($user->profile_photo) && ! Storage::disk('public')->delete($user->profile_photo)) {
                    throw new \RuntimeException('Photo deletion failed; account retained for retry.');
                }
                $user->tokens()->delete();
                $user->delete();
            }
            $item->update(['status' => $data['status'], 'review_notes' => $data['review_notes'], 'reviewed_at' => now()]);

            return $item->fresh();
        }, 5);

        return response()->json($item);
    }
}
