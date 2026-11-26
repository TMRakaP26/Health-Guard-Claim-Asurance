<?php

use App\Http\Middleware\ActiveUser;
use App\Http\Middleware\AuditRequest;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $proxies = array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', '')))));
        $hosts = array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_HOSTS', '')))));
        if ($proxies) {
            $middleware->trustProxies(at: $proxies);
        }
        if ($hosts) {
            $middleware->trustHosts(at: array_map(fn ($host) => '^'.preg_quote($host, '/').'$', $hosts), subdomains: false);
        }
        // Framework default redirects guests to route('login'), which this
        // Sanctum-only API never defines: resolving it throws a routing error
        // and turns an unauthenticated request into a 500. api/* renders JSON
        // 401 below, so no guest redirect target is needed.
        $middleware->redirectGuestsTo(null);
        $middleware->api(append: [AuditRequest::class]);
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'active' => ActiveUser::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (QueryException $error) {
            Log::error('database.query_failed', ['sqlstate' => (string) $error->getCode()]);

            return false; // SQL bindings can contain patient details or credentials.
        });
        // This API has no `login` route. Without this handler a browser-style
        // request (no Accept: application/json) is redirected to that missing
        // route while rendering the auth failure and returns 500 instead of 401.
        $exceptions->render(
            fn (AuthenticationException $error, Request $request) => $request->is('api/*')
                ? response()->json(['message' => 'Unauthenticated.'], 401)
                : null,
        );
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
