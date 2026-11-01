<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        \App\Models\Provider::firstOrCreate(['code' => 'DEMO-CLINIC'], ['name' => 'Demo Clinic (sample only)']);
        \App\Models\ClaimCategory::firstOrCreate(['code' => 'DEMO-OUTPATIENT'], [
            'name' => 'Outpatient', 'coverage_rules' => 'Demo category only. Actual policy eligibility must be verified by an analyst.',
        ]);
    }
}
