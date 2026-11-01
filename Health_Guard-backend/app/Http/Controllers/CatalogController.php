<?php

namespace App\Http\Controllers;

use App\Models\ClaimCategory;
use App\Models\Provider;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['providers' => Provider::where('is_active', true)->orderBy('name')->get(),
            'categories' => ClaimCategory::where('is_active', true)->orderBy('name')->get(),
            'features' => config('healthguard.features'), 'max_amount' => config('healthguard.max_amount')]);
    }

    public function save(Request $request, string $kind, ?int $id = null)
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_unless(in_array($kind, ['providers', 'categories'], true), 404);
        $model = $kind === 'providers' ? Provider::class : ClaimCategory::class;
        $table = $kind === 'providers' ? 'providers' : 'claim_categories';
        $data = $request->validate(['name' => 'required|string|max:255', 'code' => ['required', 'string', 'max:30', Rule::unique($table)->ignore($id)],
            'is_active' => 'sometimes|boolean', 'address' => 'sometimes|nullable|string|max:1000',
            'diagnosis_code' => 'sometimes|nullable|string|max:30', 'coverage_rules' => 'sometimes|nullable|string|max:4000',
            'coverage_limit' => 'sometimes|nullable|numeric|decimal:0,2|gt:0|max:'.config('healthguard.max_amount')]);
        $allowed = $kind === 'providers' ? ['name', 'code', 'is_active', 'address'] : ['name', 'code', 'is_active', 'diagnosis_code', 'coverage_rules', 'coverage_limit'];
        $item = $id ? $model::findOrFail($id) : new $model;
        $item->fill(array_intersect_key($data, array_flip($allowed)))->save();

        return response()->json($item, $id ? 200 : 201);
    }

    public function manage(Request $request)
    {
        abort_unless($request->user()->isAdmin(), 403);

        return response()->json(['providers' => Provider::orderBy('name')->get(), 'categories' => ClaimCategory::orderBy('name')->get()]);
    }
}
