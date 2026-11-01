<?php

namespace App\Http\Controllers;

use App\Http\Requests\ClaimListRequest;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(ClaimListRequest $request, ClaimController $claims)
    {
        abort_unless($request->user()->isAnalyst() || $request->user()->isAdmin(), 403);
        $query = $claims->query($request);
        $total = (clone $query)->count();
        $approved = (clone $query)->whereIn('status', ['Approved', 'Partially Approved'])->count();
        $turnarounds = DB::table('claim_histories')->join('claims', 'claims.id', '=', 'claim_histories.claim_id')
            ->whereIn('claims.id', (clone $query)->select('claims.id'))
            ->where('event', 'status_changed')->whereIn('to_status', ['Approved', 'Partially Approved', 'Rejected'])
            ->select(['claims.date_submitted', 'claim_histories.created_at'])->get();
        $hours = $turnarounds->map(fn ($row) => max(0, (strtotime($row->created_at) - strtotime($row->date_submitted)) / 3600));

        return response()->json(['total' => $total, 'approved' => $approved, 'approval_rate' => $total ? round($approved / $total * 100, 2) : 0,
            'average_decision_hours' => $hours->isEmpty() ? null : round($hours->avg(), 2),
            'by_status' => (clone $query)->selectRaw('status as label,COUNT(*) as count,SUM(amount) as amount')->groupBy('status')->get(),
            'by_provider' => (clone $query)->selectRaw('provider_name as label,COUNT(*) as count,SUM(amount) as amount')->groupBy('provider_name')->get(),
            'by_type' => (clone $query)->selectRaw('type as label,COUNT(*) as count,SUM(amount) as amount')->groupBy('type')->get()]);
    }
}
