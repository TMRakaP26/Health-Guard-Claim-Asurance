<?php

namespace App\Http\Controllers;

use App\Enums\ClaimStatus;
use App\Models\Claim;
use App\Services\ClaimHistoryService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class PaymentController extends Controller
{
    public function show(Request $request, string $id)
    {
        abort_unless(config('healthguard.features.payments'), 404);
        $claim = Claim::where('claim_id', $id)->firstOrFail();
        Gate::authorize('view', $claim);

        return response()->json(['data' => $claim->payments()->first()]);
    }

    public function record(Request $request, string $id, ClaimHistoryService $history, NotificationService $notifications)
    {
        abort_unless(config('healthguard.features.payments'), 404);
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate(['status' => 'required|in:paid,settled', 'amount' => 'required|numeric|decimal:0,2|gt:0|max:'.config('healthguard.max_amount'),
            'reference' => 'required|string|max:100', 'paid_at' => 'required|date|before_or_equal:now']);
        $payment = DB::transaction(function () use ($request, $id, $data, $history, $notifications) {
            $claim = Claim::where('claim_id', $id)->lockForUpdate()->firstOrFail();
            abort_unless(in_array($claim->status, [ClaimStatus::Approved, ClaimStatus::PartiallyApproved], true), 409, 'Claim must be approved before recording payment.');
            abort_if((float) $data['amount'] > (float) $claim->approved_amount, 422, 'Payment exceeds approved amount.');
            $payment = $claim->payments()->first();
            if ($payment) {
                abort_unless($payment->status === 'paid' && $data['status'] === 'settled', 409, 'Only paid to settled is permitted.');
                abort_unless((float) $payment->amount === (float) $data['amount'] && $payment->reference === $data['reference'], 422, 'A settled payment must preserve the recorded amount and reference.');
                $payment->update(['status' => 'settled', 'settled_at' => now(), 'recorded_by' => $request->user()->id]);
            } else {
                abort_unless($data['status'] === 'paid', 409, 'Record payment before settlement.');
                $payment = $claim->payments()->create($data + ['recorded_by' => $request->user()->id]);
            }
            $history->record($claim, $request->user(), 'payment_'.$data['status'], $claim->status->value, $claim->status->value,
                metadata: ['payment_id' => $payment->id, 'amount' => $payment->amount, 'reference' => $payment->reference]);
            $notifications->send($claim->user, $claim, 'payment_updated', 'Payment record updated', 'A reimbursement record has been updated.');

            return $payment;
        }, 5);

        return response()->json($payment);
    }
}
