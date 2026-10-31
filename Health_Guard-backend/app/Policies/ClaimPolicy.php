<?php

namespace App\Policies;

use App\Models\Claim;
use App\Models\User;

class ClaimPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isClient() || $user->isAnalyst();
    }

    // Analysts may inspect all claims; only the assigned analyst may decide.
    public function view(User $user, Claim $claim): bool
    {
        return $user->isAnalyst() || ($user->isClient() && $claim->user_id === $user->id);
    }

    public function create(User $user): bool
    {
        return $user->isClient();
    }

    public function update(User $user, Claim $claim): bool
    {
        return $user->isClient() && $claim->user_id === $user->id;
    }

    public function assign(User $user, Claim $claim): bool
    {
        return $user->isAnalyst();
    }

    public function decide(User $user, Claim $claim): bool
    {
        return $user->isAnalyst() && $claim->assigned_to === $user->id;
    }

    public function uploadDocument(User $user, Claim $claim): bool
    {
        return $this->update($user, $claim);
    }

    public function viewHistory(User $user, Claim $claim): bool
    {
        return $this->view($user, $claim);
    }
}
