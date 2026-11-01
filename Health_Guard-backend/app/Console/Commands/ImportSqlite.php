<?php
namespace App\Console\Commands;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PDO;
class ImportSqlite extends Command {
    protected $signature='healthguard:import-sqlite {source : Path to a read-only backup copy of the old SQLite database}';
    protected $description='Import preserved IDs and relationships into a migrated, empty MySQL database';
    public function handle(): int {
        if(DB::getDriverName()!=='mysql'){$this->error('Destination must be MySQL.');return self::FAILURE;}
        $path=realpath($this->argument('source'));
        if(!$path || !is_file($path)){$this->error('Source backup does not exist.');return self::FAILURE;}
        $tables=['users','claims','claim_histories','claim_drafts','claim_messages','claim_document_requests','documents','claim_payments','notifications','providers','claim_categories','analyst_invitations','deletion_requests'];
        foreach($tables as $table){if(DB::table($table)->exists()){$this->error('Destination is not empty; import refused.');return self::FAILURE;}}
        $source=new PDO('sqlite:'.$path,null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        $source->exec('PRAGMA query_only=ON');
        $sourceTables=$source->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
        try {
            DB::transaction(function()use($source,$sourceTables,$tables){
                foreach($tables as $table) {
                    if(!in_array($table,$sourceTables,true)){continue;}
                    $columns=array_flip(Schema::getColumnListing($table));
                    $statement=$source->query('SELECT * FROM "'.$table.'" ORDER BY id');
                    while($row=$statement->fetch(PDO::FETCH_ASSOC)) {
                        $row=array_intersect_key($row,$columns);
                        foreach($row as $key=>&$value){
                            if($value!==null && (str_ends_with($key,'_at') || $key==='date_submitted')){$value=\Carbon\Carbon::parse($value)->format('Y-m-d H:i:s');}
                        } unset($value);
                        DB::table($table)->insert($row);
                    }
                }
            });
            $this->call('healthguard:backfill-history');
            $this->info('Import completed. API tokens and reset tokens were deliberately not imported; users must sign in again.');
            return self::SUCCESS;
        } catch(\Throwable $e) {
            $this->error('Import failed and was rolled back. Check schema compatibility and the source backup; no source data was modified.');
            return self::FAILURE;
        }
    }
}
