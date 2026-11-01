<?php

return [
    'max_amount' => '99999999.99',
    'demo_seed' => env('DEMO_SEED_ENABLED', false),
    'features' => [
        'messages' => env('FEATURE_MESSAGES', true),
        'payments' => env('FEATURE_PAYMENTS', true),
        'email' => env('FEATURE_EMAIL', false),
        'retention' => env('FEATURE_RETENTION', false),
    ],
    'retention_days' => (int) env('RETENTION_DAYS', 0),
    'sla_hours' => (int) env('CLAIM_SLA_HOURS', 72),
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
];
