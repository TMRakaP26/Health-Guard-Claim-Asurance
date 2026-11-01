<?php

namespace Database\Seeders;

use App\Models\Claim;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing']) || (! app()->environment('testing') && ! config('healthguard.demo_seed'))) {
            throw new \RuntimeException('Demo seeding requires APP_ENV=local and DEMO_SEED_ENABLED=true.');
        }
        // Create analyst user
        $analyst = User::firstOrCreate(['email' => 'analyst@healthguard.com'], [
            'name' => 'Sarah Analyst',
            'email' => 'analyst@healthguard.com',
            'password' => bcrypt('password'),
            'role' => 'analyst',
        ]);

        // Create client user
        $client = User::firstOrCreate(['email' => 'client@healthguard.com'], [
            'name' => 'John Doe',
            'email' => 'client@healthguard.com',
            'password' => bcrypt('password'),
            'role' => 'client',
        ]);

        // Create seed claims
        $claims = [
            [
                'user_id' => $client->id,
                'claim_id' => 'CLM-2026-001',
                'client_name' => 'Sarah Jenkins',
                'provider_name' => 'City General Hospital',
                'type' => 'Specialist Visit',
                'amount' => 350.00,
                'status' => 'Pending',
                'date_submitted' => '2026-05-12 10:00:00',
            ],
            [
                'user_id' => $client->id,
                'claim_id' => 'CLM-2026-002',
                'client_name' => 'Michael Chang',
                'provider_name' => 'Dr. Sarah Mitchell',
                'type' => 'Emergency Room',
                'amount' => 1250.00,
                'status' => 'Pending',
                'date_submitted' => '2026-05-11 14:30:00',
            ],
            [
                'user_id' => $client->id,
                'claim_id' => 'CLM-2026-003',
                'client_name' => 'Amanda Rossi',
                'provider_name' => 'Downtown Pharmacy',
                'type' => 'Prescription',
                'amount' => 45.99,
                'status' => 'Approved',
                'date_submitted' => '2026-05-10 09:15:00',
            ],
            [
                'user_id' => $client->id,
                'claim_id' => 'CLM-2026-004',
                'client_name' => 'David Kim',
                'provider_name' => 'Smile Dental Clinic',
                'type' => 'Dental Surgery',
                'amount' => 850.00,
                'status' => 'Rejected',
                'date_submitted' => '2026-05-09 16:45:00',
            ],
        ];

        foreach ($claims as $claimData) {
            Claim::firstOrCreate(['claim_id' => $claimData['claim_id']], $claimData);
        }
        $this->call(\Database\Seeders\CatalogSeeder::class);
        \Illuminate\Support\Facades\Artisan::call('healthguard:backfill-history');
    }
}
