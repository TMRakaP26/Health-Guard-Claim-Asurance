<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class E2ESeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('testing')) {
            throw new \RuntimeException('E2E fixtures require APP_ENV=testing.');
        }
        foreach (['client', 'analyst', 'admin'] as $role) {
            User::firstOrCreate(['email' => $role.'@e2e.example.test'], ['name' => 'E2E '.ucfirst($role), 'role' => $role, 'password' => Hash::make('E2E-only-password-2026')]);
        }
        $this->call(CatalogSeeder::class);
    }
}
