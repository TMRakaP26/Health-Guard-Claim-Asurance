<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class AuditRequest
{
    public function handle(Request $request, Closure $next)
    {
        $id = (string) Str::uuid();
        $started = microtime(true);
        $status = 500;
        try {
            $response = $next($request);
            $status = $response->getStatusCode();
            $response->headers->set('X-Request-ID', $id);

            return $response;
        } catch (\Throwable $error) {
            $status = match (true) {
                $error instanceof HttpExceptionInterface => $error->getStatusCode(),
                $error instanceof ValidationException => 422,
                $error instanceof AuthenticationException => 401,
                $error instanceof AuthorizationException => 403,
                $error instanceof ModelNotFoundException => 404,
                default => 500,
            };
            throw $error;
        } finally {
            Log::info('api.request', ['request_id' => $id, 'method' => $request->method(), 'route' => $request->route()?->uri(), 'status' => $status, 'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
        }
    }
}
