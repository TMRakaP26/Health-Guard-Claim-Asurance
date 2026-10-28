<?php

namespace App\Http\Controllers;

use App\Models\Claim;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(Request $request, string $claimId): JsonResponse
    {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail();

        if ($request->user()->isClient() && $claim->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($claim->documents);
    }

    public function store(Request $request, string $claimId): JsonResponse
    {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail();

        if ($claim->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'public');

        $document = Document::create([
            'claim_id' => $claim->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
        ]);

        return response()->json($document, 201);
    }

    public function download(Request $request, string $claimId, string $documentId): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail();

        if ($request->user()->isClient() && $claim->user_id !== $request->user()->id) {
            abort(403);
        }

        $document = Document::where('claim_id', $claim->id)
            ->where('id', $documentId)
            ->firstOrFail();

        return Storage::disk('public')->download($document->file_path, $document->file_name);
    }
}
