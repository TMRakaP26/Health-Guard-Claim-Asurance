<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

class DocumentPolicy
{
    public function view(User $user, Document $document): bool
    {
        return (new ClaimPolicy)->view($user, $document->claim);
    }

    public function download(User $user, Document $document): bool
    {
        return $this->view($user, $document);
    }
}
