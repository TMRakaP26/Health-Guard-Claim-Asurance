<?php
namespace App\Http\Controllers;
use App\Models\Claim;
use App\Models\Document;
use App\Models\ClaimDocumentRequest;
use App\Models\ClaimMessage;
use App\Http\Requests\DocumentUploadRequest;
use App\Http\Resources\DocumentResource;
use App\Services\ClaimHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Gate;
class DocumentController extends Controller {
    public function index(Request $request, string $claimId) {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail(); Gate::authorize('view', $claim);
        return response()->json(DocumentResource::collection($claim->documents)->resolve());
    }
    public function store(DocumentUploadRequest $request, string $claimId, ClaimHistoryService $history) {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail();
        $file = $request->file('file'); $path = $file->store('documents', 'private');
        try {
            $document = DB::transaction(function () use ($request, $claim, $file, $path, $history) {
                $claim = Claim::whereKey($claim->id)->lockForUpdate()->firstOrFail();
                Gate::authorize('uploadDocument', $claim);
                $requested = $request->filled('request_id') ? ClaimDocumentRequest::where('claim_id', $claim->id)->whereKey($request->integer('request_id'))->lockForUpdate()->firstOrFail() : null;
                if ($request->filled('message_id')) { ClaimMessage::where('claim_id', $claim->id)->where('user_id', $request->user()->id)->whereKey($request->integer('message_id'))->firstOrFail(); }
                if ($requested) { abort_unless($requested->status === 'open', 409, 'This document request is already fulfilled.'); }
                $document = Document::create(['claim_id' => $claim->id, 'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path, 'file_size' => $file->getSize(), 'mime_type' => $file->getMimeType(),
                    'request_id' => $requested?->id, 'message_id' => $request->input('message_id')]);
                if ($requested) { $requested->update(['status' => 'fulfilled', 'fulfilled_at' => now()]); }
                $history->record($claim, $request->user(), 'document_uploaded', $claim->status->value, $claim->status->value,
                    metadata: ['document_id' => $document->id, 'file_name' => $document->file_name, 'request_id' => $requested?->id]);
                return $document;
            }, 5);
        } catch (\Throwable $error) { Storage::disk('private')->delete($path); throw $error; }
        return response()->json((new DocumentResource($document))->resolve(), 201);
    }
    public function download(Request $request, string $claimId, string $documentId) {
        $claim = Claim::where('claim_id', $claimId)->firstOrFail(); Gate::authorize('view', $claim);
        $document = Document::where('claim_id', $claim->id)->whereKey($documentId)->firstOrFail();
        Gate::authorize('download', $document);
        abort_unless(Storage::disk('private')->exists($document->file_path), 404, 'Document file not found.');
        return Storage::disk('private')->download($document->file_path, $document->file_name, [
            'Content-Type' => $document->mime_type, 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }
}
