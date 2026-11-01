<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
class AuditRequest {
    public function handle(Request $request, Closure $next) {
        $id = (string) Str::uuid();
        $started = microtime(true);
        $response = $next($request);
        if ($request->is('api/*')) {
            Log::info('api.request', [
                'request_id' => $id, 'method' => $request->method(),
                'route' => $request->route()?->uri(), 'status' => $response->getStatusCode(),
                'duration_ms' => (int) ((microtime(true) - $started) * 1000),
            ]);
        }
        $response->headers->set('X-Request-ID', $id);
        return $response;
    }
}
