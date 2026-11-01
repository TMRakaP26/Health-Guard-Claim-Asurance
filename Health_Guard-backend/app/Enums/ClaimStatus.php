<?php

namespace App\Enums;

enum ClaimStatus: string
{
    case Pending = 'Pending';
    case Approved = 'Approved';
    case Rejected = 'Rejected';
    case NeedsInfo = 'Needs Info';
    case PartiallyApproved = 'Partially Approved';

    public function canResubmit(): bool
    {
        return in_array($this, [self::Rejected, self::NeedsInfo, self::PartiallyApproved], true);
    }
}
