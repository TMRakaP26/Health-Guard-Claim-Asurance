<?php

namespace App\Http\Controllers;

use App\Models\Claim;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClaimController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Claim::with(['user', 'assignedAnalyst']);

        if ($user->isClient()) {
            $query->where('user_id', $user->id);
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $claims = $query->orderBy('date_submitted', 'desc')->paginate($perPage);

        return response()->json($claims);
    }

    public function unassigned(Request $request): JsonResponse
    {
        $claims = Claim::with(['user', 'assignedAnalyst'])
            ->whereNull('assigned_to')
            ->where('status', 'Pending')
            ->orderBy('date_submitted', 'desc')
            ->paginate(min((int) $request->get('per_page', 20), 100));

        return response()->json($claims);
    }

    public function myAssignments(Request $request): JsonResponse
    {
        $claims = Claim::with(['user', 'assignedAnalyst'])
            ->where('assigned_to', $request->user()->id)
            ->orderBy('date_submitted', 'desc')
            ->paginate(min((int) $request->get('per_page', 20), 100));

        return response()->json($claims);
    }

    public function assign(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->isAnalyst()) {
            return response()->json(['message' => 'Forbidden. Only analysts can assign claims.'], 403);
        }

        $claim = Claim::where('claim_id', $id)->firstOrFail();

        if ($claim->assigned_to !== null) {
            return response()->json(['message' => 'This claim is already assigned to another analyst.'], 409);
        }

        $claim->update(['assigned_to' => $request->user()->id]);

        // Notify the claim owner that their claim is being reviewed
        Notification::create([
            'user_id' => $claim->user_id,
            'type' => 'claim_assigned',
            'title' => 'Claim Under Review',
            'body' => "Your claim {$claim->claim_id} is now being reviewed by an analyst.",
            'claim_id' => $claim->claim_id,
        ]);

        return response()->json([
            'claim' => $claim->load(['user', 'assignedAnalyst']),
            'message' => 'Claim assigned successfully',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'required|string|max:255',
            'type' => 'required|string|max:255',
            'provider_name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'bpjs_number' => 'sometimes|string|max:30',
        ]);

        $claim = Claim::create([
            'user_id' => $request->user()->id,
            'claim_id' => 'CLM-' . date('Y') . '-' . str_pad(random_int(0, 999), 3, '0', STR_PAD_LEFT),
            'client_name' => $validated['client_name'],
            'type' => $validated['type'],
            'provider_name' => $validated['provider_name'],
            'amount' => $validated['amount'],
            'bpjs_number' => $validated['bpjs_number'] ?? null,
            'status' => 'Pending',
            'date_submitted' => now(),
        ]);

        // Notify all analysts about the new claim
        $analysts = User::where('role', 'analyst')->get();
        foreach ($analysts as $analyst) {
            Notification::create([
                'user_id' => $analyst->id,
                'type' => 'claim_submitted',
                'title' => 'New Claim Submitted',
                'body' => "A new claim {$claim->claim_id} from {$claim->client_name} has been submitted and needs review.",
                'claim_id' => $claim->claim_id,
            ]);
        }

        return response()->json($claim->load('assignedAnalyst'), 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $claim = Claim::with(['user', 'documents', 'assignedAnalyst'])->where('claim_id', $id)->firstOrFail();

        if ($request->user()->isClient() && $claim->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($claim);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $claim = Claim::where('claim_id', $id)->firstOrFail();

        if ($request->user()->isClient() && $claim->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'client_name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|max:255',
            'provider_name' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
        ]);

        $claim->update(array_merge($validated, [
            'status' => 'Pending',
            'approved_amount' => null, // Reset approved amount on resubmission
        ]));

        return response()->json($claim->load('assignedAnalyst'));
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->isAnalyst()) {
            return response()->json(['message' => 'Forbidden. Only analysts can update status.'], 403);
        }

        $claim = Claim::where('claim_id', $id)->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|string|in:Pending,Approved,Rejected,Needs Info,Partially Approved',
            'notes' => 'nullable|string',
            'approved_amount' => 'nullable|numeric|min:0',
        ]);

        $claim->update($validated);

        // Notify the claim owner about the status change
        $statusLabel = $validated['status'];
        $notesSuffix = $validated['notes'] ? ": {$validated['notes']}" : '.';
        Notification::create([
            'user_id' => $claim->user_id,
            'type' => 'status_changed',
            'title' => "Claim {$statusLabel}",
            'body' => "Your claim {$claim->claim_id} status has been updated to {$statusLabel}{$notesSuffix}",
            'claim_id' => $claim->claim_id,
        ]);

        return response()->json($claim->load('assignedAnalyst'));
    }
}
