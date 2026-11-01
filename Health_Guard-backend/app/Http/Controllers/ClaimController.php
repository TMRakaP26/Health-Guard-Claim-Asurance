<?php
namespace App\Http\Controllers;
use App\Models\Claim;
use App\Http\Requests\ClaimInputRequest;
use App\Http\Requests\ClaimDecisionRequest;
use App\Http\Requests\ClaimListRequest;
use App\Http\Resources\ClaimResource;
use App\Http\Resources\ClaimHistoryResource;
use App\Services\ClaimService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
class ClaimController extends Controller
{
    public function __construct(private ClaimService $claims) {}
    public function query(ClaimListRequest $request, ?string $scope = null): Builder
    {
        Gate::authorize('viewAny', Claim::class);
        $request->validated();
        $query = Claim::query();
        if ($request->user()->isClient()) { $query->where('user_id', $request->user()->id); }
        $scope ??= $request->input('scope', 'all');
        if ($scope !== 'all') {
            abort_unless($request->user()->isAnalyst() || $request->user()->isAdmin(), 403);
            if ($scope === 'assigned') { $query->where('assigned_to', $request->user()->id); }
            if ($scope === 'unassigned') { $query->whereNull('assigned_to')->where('status', 'Pending'); }
        }
        if ($request->filled('status')) { $query->where('status', $request->input('status')); }
        if ($request->filled('q')) {
            $term = '%'.addcslashes($request->input('q'), '%_\\').'%';
            $query->where(fn (Builder $q) => $q->where('claim_id', 'like', $term)->orWhere('client_name', 'like', $term)->orWhere('provider_name', 'like', $term)->orWhere('type', 'like', $term));
        }
        if ($request->filled('date_from')) { $query->whereDate('date_submitted', '>=', $request->input('date_from')); }
        if ($request->filled('date_to')) { $query->whereDate('date_submitted', '<=', $request->input('date_to')); }
        return $query;
    }
    private function listing(ClaimListRequest $request, ?string $scope = null)
    {
        $query = $this->query($request, $scope);
        $stats = ['total' => (clone $query)->count(), 'amount' => (string) (clone $query)->sum('amount'),
            'approved_amount' => (string) (clone $query)->sum('approved_amount'),
            'by_status' => (clone $query)->selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status')];
        [$column, $direction] = match ($request->input('sort', 'newest')) {
            'oldest' => ['date_submitted', 'asc'], 'amount_asc' => ['amount', 'asc'],
            'amount_desc' => ['amount', 'desc'], default => ['date_submitted', 'desc'],
        };
        $page = $query->with('assignedAnalyst')->orderBy($column, $direction)->orderBy('id', $direction)->paginate($request->integer('per_page', 20));
        $body = $page->toArray();
        $body['data'] = ClaimResource::collection($page->getCollection())->resolve();
        $body['stats'] = $stats;
        return response()->json($body);
    }
    public function index(ClaimListRequest $request) { return $this->listing($request); }
    public function unassigned(ClaimListRequest $request) { return $this->listing($request, 'unassigned'); }
    public function myAssignments(ClaimListRequest $request) { return $this->listing($request, 'assigned'); }
    public function show(Request $request, string $id)
    {
        $claim = Claim::where('claim_id', $id)->with(['assignedAnalyst', 'documents'])->firstOrFail();
        Gate::authorize('view', $claim);
        return response()->json((new ClaimResource($claim))->resolve());
    }
    public function store(ClaimInputRequest $request)
    {
        return response()->json((new ClaimResource($this->claims->create($request->user(), $request->validated())))->resolve(), 201);
    }
    public function update(ClaimInputRequest $request, string $id)
    {
        return response()->json((new ClaimResource($this->claims->resubmit($request->user(), Claim::where('claim_id', $id)->firstOrFail(), $request->validated())))->resolve());
    }
    public function assign(Request $request, string $id)
    {
        return response()->json(['claim' => (new ClaimResource($this->claims->assign($request->user(), Claim::where('claim_id', $id)->firstOrFail())))->resolve(), 'message' => 'Claim assigned successfully']);
    }
    public function updateStatus(ClaimDecisionRequest $request, string $id)
    {
        return response()->json((new ClaimResource($this->claims->decide($request->user(), Claim::where('claim_id', $id)->firstOrFail(), $request->validated())))->resolve());
    }
    public function history(Request $request, string $id)
    {
        $claim = Claim::where('claim_id', $id)->firstOrFail();
        Gate::authorize('viewHistory', $claim);
        $data = $request->validate(['per_page' => 'sometimes|integer|min:1|max:100', 'page' => 'sometimes|integer|min:1', 'order' => 'sometimes|in:asc,desc']);
        $order = $data['order'] ?? 'desc';
        return ClaimHistoryResource::collection($claim->histories()->with('actor')->orderBy('created_at', $order)->orderBy('id', $order)->paginate($data['per_page'] ?? 50));
    }
    public function export(ClaimListRequest $request)
    {
        abort_unless($request->user()->isAnalyst() || $request->user()->isAdmin(), 403);
        $query = $this->query($request)->with('assignedAnalyst')->orderBy('id');
        return response()->streamDownload(function () use ($query) {
            $stream = fopen('php://output', 'w');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['Claim ID', 'Client', 'Submitted', 'Type', 'Provider', 'Amount (IDR)', 'Approved (IDR)', 'Analyst', 'Status'], escape: '');
            foreach ($query->lazy(200) as $claim) {
                $row = [$claim->claim_id, $claim->client_name, $claim->date_submitted->toISOString(), $claim->type,
                    $claim->provider_name, $claim->amount, $claim->approved_amount, $claim->assignedAnalyst?->name, $claim->status->value];
                $row = array_map(fn ($value) => preg_match('/^[=+@\-\t\r\n]/', (string) $value) ? "'".$value : $value, $row);
                fputcsv($stream, $row, escape: '');
            }
            fclose($stream);
        }, 'healthguard-claims.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store']);
    }
}
