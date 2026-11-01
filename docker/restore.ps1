param([Parameter(Mandatory=$true)][string]$Project,[Parameter(Mandatory=$true)][string]$BackupDirectory,[switch]$ConfirmRestore)
$ErrorActionPreference='Stop'
if(-not $ConfirmRestore){throw 'Restore replaces the target database and files. Use a disposable project or an approved maintenance window, then pass -ConfirmRestore.'}
if($Project -eq 'healthguard'){throw 'Restore to a separate project first. Production cutover must follow the reviewed runbook.'}
$source=(Resolve-Path -LiteralPath $BackupDirectory).Path
$checksums=Get-Content -LiteralPath (Join-Path $source 'checksums.json') -Raw | ConvertFrom-Json
if(@($checksums).Count -ne 2 -or @($checksums.Name | Sort-Object -Unique).Count -ne 2 -or 'database.sql' -notin $checksums.Name -or 'files.tar.gz' -notin $checksums.Name){throw 'Backup must contain checksums for database.sql and files.tar.gz exactly once'}
foreach($entry in $checksums){if($entry.Name -notin @('database.sql','files.tar.gz')){throw 'Unexpected backup filename'};if((Get-FileHash -LiteralPath (Join-Path $source $entry.Name) -Algorithm SHA256).Hash -ne $entry.Hash){throw 'Backup checksum mismatch'}}
function Invoke-Compose { & docker compose -p $Project @args; if($LASTEXITCODE -ne 0){throw 'Docker restore operation failed'} }
Invoke-Compose exec -T backend php artisan down
# Keep maintenance enabled if any step fails. The operator can inspect before allowing traffic.
Invoke-Compose cp (Join-Path $source 'database.sql') db:/tmp/healthguard-restore.sql
Invoke-Compose cp (Join-Path $source 'files.tar.gz') backend:/tmp/healthguard-restore.tar.gz
Invoke-Compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" < /tmp/healthguard-restore.sql'
Invoke-Compose exec -T backend tar -xzf /tmp/healthguard-restore.tar.gz -C /var/www
Invoke-Compose exec -T backend chown -R www-data:www-data /var/www/html/storage /var/www/appdata
Invoke-Compose exec -T db rm -f /tmp/healthguard-restore.sql
Invoke-Compose exec -T backend rm -f /tmp/healthguard-restore.tar.gz
Invoke-Compose restart backend
Invoke-Compose exec -T backend php artisan up
Invoke-Compose up -d --wait
Write-Output 'Restore completed. Run smoke checks and compare record counts before cutover.'

