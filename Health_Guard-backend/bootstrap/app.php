<?php

use App\Http\Middleware\ActiveUser;
use App\Http\Middleware\AuditRequest;
use App\Http\Middleware\RoleMiddleware;
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
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
