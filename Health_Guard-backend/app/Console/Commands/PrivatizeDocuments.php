<?php

namespace App\Console\Commands;

use App\Models\Document;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PrivatizeDocuments extends Command
{
    protected $signature = 'healthguard:privatize-documents';

    protected $description = 'Move legacy public claim documents to private storage, verifying each copy';

    public function handle(): int
    {
        $public = Storage::disk('public');
        $private = Storage::disk('private');
        $failed = false;
        foreach (Document::orderBy('id')->lazyById() as $document) {
            $path = $document->file_path;
            // Refuse unexpected paths; never move photos or unrelated files.
            if (! preg_match('~^documents/[A-Za-z0-9_-]+\.[A-Za-z0-9]+$~D', $path)) {
                $this->error("Document {$document->id}: unexpected storage path.");
                $failed = true;
                continue;
            }
            try {
                if (! $public->exists($path)) {
                    if (! $private->exists($path)) {
                        throw new \RuntimeException('File is missing from both disks.');
                    }
                    continue;
                }
                if (! $private->exists($path)) {
                    $stream = $public->readStream($path);
                    try {
                        $private->writeStream($path, $stream);
                    } finally {
                        if (is_resource($stream)) {
                            fclose($stream);
                        }
                    }
                }
                $sourceHash = hash_file('sha256', $public->path($path));
                $targetHash = hash_file('sha256', $private->path($path));
                if ($sourceHash === false || $targetHash === false || ! hash_equals($sourceHash, $targetHash)) {
                    throw new \RuntimeException('Checksum mismatch; public original was preserved.');
                }
                if (! $public->delete($path)) {
                    throw new \RuntimeException('Could not remove the verified public copy.');
                }
                $this->info("Document {$document->id}: moved and verified.");
            } catch (\Throwable $exception) {
                $this->error("Document {$document->id}: migration failed; inspect file permissions and integrity.");
                $failed = true;
            }
        }

        if ($failed) {
            $this->error('Migration incomplete. Resolve failed documents before serving traffic.');
            return self::FAILURE;
        }
        $this->info('All referenced documents are private. Safe to run again.');
        return self::SUCCESS;
    }
}
