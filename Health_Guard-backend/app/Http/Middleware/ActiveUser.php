<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ActiveUser
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->user() && ! $request->user()->is_active) {
            $request->user()->tokens()->delete();
            abort(403, 'This account is inactive.');
        }

        return $next($request);
    }
}
