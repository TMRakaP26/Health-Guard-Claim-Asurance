<?php

namespace Database\Seeders;

use App\Models\ClaimCategory;
use App\Models\Provider;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        Provider::firstOrCreate(['code' => 'DEMO-CLINIC'], ['name' => 'Demo Clinic (sample only)']);
        ClaimCategory::firstOrCreate(['code' => 'DEMO-OUTPATIENT'], [
            'name' => 'Outpatient', 'coverage_rules' => 'Demo category only. Actual policy eligibility must be verified by an analyst.',
        ]);
    }
}
