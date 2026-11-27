<?php

namespace App\Services;

use App\Enums\ClaimStatus;
use App\Models\Claim;
use App\Models\ClaimDraft;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;

class ClaimService
{
    public function __construct(private ClaimHistoryService $history, private NotificationService $notifications) {}

    public function create(User $actor, array $data): Claim
    {
        return $this->submit($actor, $data)['claim'];
    }

    /**
     * Create a claim once per client-generated submission key.
     *
     * @return array{claim: Claim, replayed: bool}
     */
    public function submit(User $actor, array $data): array
    {
        Gate::forUser($actor)->authorize('create', Claim::class);
        $key = $data['submission_key'] ?? null;
        $draftId = $data['draft_id'] ?? null;
        unset($data['submission_key'], $data['draft_id']);

        try {
            return $this->createOnce($actor, $data, $key, $draftId);
        } catch (UniqueConstraintViolationException $error) {
            // A concurrent request won the insert race for this key.
            if ($key === null) {
                throw $error;
            }
            $existing = Claim::where('user_id', $actor->id)->where('submission_key', $key)
                ->with('assignedAnalyst')->first();
            if (! $existing) {
                throw $error;
            }

            return ['claim' => $existing, 'replayed' => true];
        }
    }

    /** @return array{claim: Claim, replayed: bool} */
    private function createOnce(User $actor, array $data, ?string $key, ?int $draftId): array
    {
        return DB::transaction(function () use ($actor, $data, $key, $draftId) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            abort_unless($actor->is_active, 403);
            if ($key !== null) {
                $existing = Claim::where('user_id', $actor->id)->where('submission_key', $key)->lockForUpdate()->first();
                if ($existing) {
                    return ['claim' => $existing->load('assignedAnalyst'), 'replayed' => true];
                }
            }
            if ($draftId !== null) {
                // Only the owning client may convert a draft into this claim.
                abort_unless(ClaimDraft::where('user_id', $actor->id)->whereKey($draftId)->exists(), 404);
            }
            $year = now()->year;
            if (! DB::table('claim_sequences')->where('year', $year)->exists()) {
                $maximum = Claim::where('claim_id', 'like', "CLM-$year-%")->pluck('claim_id')
                    ->map(fn ($id) => (int) substr($id, strrpos($id, '-') + 1))->max() ?? 0;
                DB::table('claim_sequences')->insertOrIgnore(['year' => $year, 'value' => $maximum]);
            }
            $sequence = DB::table('claim_sequences')->where('year', $year)->lockForUpdate()->first();
            $next = $sequence->value + 1;
            DB::table('claim_sequences')->where('year', $year)->update(['value' => $next]);
            $claim = Claim::create(array_merge($data, [
                'claim_id' => sprintf('CLM-%d-%03d', $year, $next), 'user_id' => $actor->id,
                'status' => ClaimStatus::Pending, 'date_submitted' => now(),
                'submission_key' => $key,
            ]));
            if ($draftId !== null) {
                // The draft became this claim, so it can never be submitted again.
                ClaimDraft::where('user_id', $actor->id)->whereKey($draftId)->delete();
            }
            $this->history->record($claim, $actor, 'submitted', null, 'Pending', metadata: ['amount' => $claim->amount]);
            foreach (User::where('role', 'analyst')->where('is_active', true)->get() as $analyst) {
                $this->notifications->send($analyst, $claim, 'claim_submitted', 'New claim submitted', 'A new claim needs review.');
            }

            return ['claim' => $claim->load('assignedAnalyst'), 'replayed' => false];
        }, 5);
    }

    public function assign(User $actor, Claim $claim): Claim
    {
        return DB::transaction(function () use ($actor, $claim) {
            $claim = Claim::whereKey($claim->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('assign', $claim);
            abort_unless($claim->status === ClaimStatus::Pending && $claim->assigned_to === null, 409, 'Only unassigned Pending claims can be assigned.');
            $updated = Claim::whereKey($claim->id)->whereNull('assigned_to')->where('status', 'Pending')->update(['assigned_to' => $actor->id]);
            abort_unless($updated === 1, 409, 'Claim already assigned.');
            $claim->refresh();
            $this->history->record($claim, $actor, 'assigned', 'Pending', 'Pending', metadata: ['assigned_to' => $actor->id]);
            $this->notifications->send($claim->user, $claim, 'claim_assigned', 'Claim under review', 'An analyst has taken your claim.');

            return $claim->load('assignedAnalyst');
        }, 5);
    }

    public function resubmit(User $actor, Claim $claim, array $data): Claim
    {
        return DB::transaction(function () use ($actor, $claim, $data) {
            $claim = Claim::whereKey($claim->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('update', $claim);
            abort_unless($claim->status->canResubmit(), 409, 'Only rejected, partially approved, or Needs Info claims can be resubmitted.');
            abort_if($claim->payments()->whereIn('status', ['paid', 'settled'])->exists(), 409, 'A paid claim cannot be resubmitted.');
            $from = $claim->status->value;
            $old = $claim->only(['notes', 'approved_amount', 'amount', 'client_name', 'provider_name', 'type', 'disease_name', 'description', 'bpjs_number', 'service_date', 'patient_date_of_birth']);
            $claim->fill($data);
            $claim->status = ClaimStatus::Pending;
            $claim->approved_amount = null;
            $claim->save();
            $this->history->record($claim, $actor, 'resubmitted', $from, 'Pending', $claim->notes, metadata: ['previous' => $old]);
            $recipients = $claim->assignedAnalyst ? collect([$claim->assignedAnalyst]) : User::where('role', 'analyst')->where('is_active', true)->get();
            foreach ($recipients as $analyst) {
                $this->notifications->send($analyst, $claim, 'claim_resubmitted', 'Claim resubmitted', 'Updated information is ready for review.');
            }

            return $claim->load('assignedAnalyst');
        }, 5);
    }

    public function decide(User $actor, Claim $claim, array $data): Claim
    {
        return DB::transaction(function () use ($actor, $claim, $data) {
            $claim = Claim::whereKey($claim->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('decide', $claim);
            $from = $claim->status->value;
            $status = ClaimStatus::from($data['status']);
            if ($status === ClaimStatus::PartiallyApproved) {
                Validator::make($data, ['approved_amount' => 'required|numeric|decimal:0,2|gt:0|max:'.$claim->amount])->validate();
            }
            $amount = match ($status) {
                ClaimStatus::Approved => $claim->amount,
                ClaimStatus::PartiallyApproved => $data['approved_amount'], default => null,
            };
            $claim->fill(['status' => $status, 'notes' => $data['notes'] ?? null, 'approved_amount' => $amount]);
            if (! $claim->isDirty()) {
                return $claim->load('assignedAnalyst');
            }
            abort_if($claim->payments()->whereIn('status', ['paid', 'settled'])->exists(), 409, 'A paid claim cannot be changed.');
            $claim->save();
            $this->history->record($claim, $actor, 'status_changed', $from, $status->value, $claim->notes, $claim->approved_amount);
            $this->notifications->send($claim->user, $claim, 'status_changed', 'Claim '.$status->value, 'Your claim status has been updated to '.$status->value.'.');

            return $claim->load('assignedAnalyst');
        }, 5);
    }
}
