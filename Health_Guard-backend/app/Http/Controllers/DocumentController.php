<?php

namespace App\Http\Controllers;

use App\Models\Claim;
use App\Models\Document;
use App\Rules\SafeUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    public function index(Request $request, string $claimId): JsonResponse
    {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail();

        Gate::authorize('view', $claim);

        return response()->json($claim->documents);
    }

    public function store(Request $request, string $claimId): JsonResponse
    {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail();

        Gate::authorize('uploadDocument', $claim);

        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240', new SafeUpload],
        ]);

        $file = $request->file('file');
        $path = $file->store('documents', 'private');

        try {
            $document = Document::create([
                'claim_id' => $claim->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('private')->delete($path);
            throw $exception;
        }

        return response()->json($document, 201);
    }

    public function download(Request $request, string $claimId, string $documentId): StreamedResponse
    {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail();

        Gate::authorize('view', $claim);

        $document = Document::where('claim_id', $claim->id)
            ->where('id', $documentId)
            ->firstOrFail();

        Gate::authorize('download', $document);
        abort_unless(Storage::disk('private')->exists($document->file_path), 404, 'Document file not found.');

        return Storage::disk('private')->download($document->file_path, $document->file_name, [
            'Content-Type' => $document->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
