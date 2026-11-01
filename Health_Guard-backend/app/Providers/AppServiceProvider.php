<?php

namespace App\Providers;

use App\Models\Claim;
use App\Models\Document;
use App\Policies\ClaimPolicy;
use App\Policies\DocumentPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Auth\Notifications\ResetPassword::createUrlUsing(fn ($user, $token) => rtrim(config('healthguard.frontend_url'), '/').'/reset-password?token='.urlencode($token).'&email='.urlencode($user->email));
        \Illuminate\Auth\Notifications\VerifyEmail::toMailUsing(function ($user, $url) {
            return (new \Illuminate\Notifications\Messages\MailMessage)->subject('Verify your HealthGuard email')
                ->line('Confirm your email address to complete your account.')
                ->action('Verify email', rtrim(config('healthguard.frontend_url'), '/').'/verify-email?url='.urlencode($url));
        });
        Gate::policy(Claim::class, ClaimPolicy::class);
        Gate::policy(Document::class, DocumentPolicy::class);
        RateLimiter::for('export', fn (Request $request) => Limit::perMinute(5)->by('export:'.$request->user()?->id));

        RateLimiter::for('login', function (Request $request) {
            $email = $request->input('email');
            $identity = is_string($email) ? strtolower(trim($email)) : '';

            return [
                Limit::perMinute(20)->by('login-ip:'.$request->ip()),
                Limit::perMinute(5)->by('login-account:'.hash('sha256', $identity.'|'.$request->ip())),
            ];
        });
        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(5)->by('register:'.$request->ip()));
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by('api:'.($request->user()?->id ?? $request->ip())));
    }
}
