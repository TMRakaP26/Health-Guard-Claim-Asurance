param([Parameter(Mandatory=$true)][string]$Project,[string]$OutputDirectory='backups')
$ErrorActionPreference='Stop'
function Invoke-Compose { & docker compose -p $Project @args; if($LASTEXITCODE -ne 0){throw 'Docker backup operation failed'} }
function Invoke-ComposeShell([string]$Service,[string]$Script) {
    # stdin avoids different native argument quoting in Windows PowerShell 5 and PowerShell 7.
    # Keep PowerShell's trailing CRLF inside a shell comment.
    ($Script + "`n#") | & docker compose -p $Project exec -T $Service sh -s
    if($LASTEXITCODE -ne 0){throw 'Docker backup shell operation failed'}
}
$destination=Join-Path ([IO.Path]::GetFullPath($OutputDirectory)) (Get-Date -Format 'yyyyMMdd-HHmmss')
if(Test-Path -LiteralPath $destination){throw 'Backup destination already exists; retry with a new timestamp'}
New-Item -ItemType Directory -Path $destination | Out-Null
# Quiesce API writes so the database, files and encryption key form one consistent set.
$previousState=Invoke-ComposeShell backend 'if test -f storage/framework/down; then echo down; else echo up; fi'
if($previousState.Trim() -eq 'up'){Invoke-Compose exec -T backend php artisan down}
try {
    Invoke-ComposeShell db 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --single-transaction --no-tablespaces --set-gtid-purged=OFF -u "$MYSQL_USER" "$MYSQL_DATABASE" > /tmp/healthguard-backup.sql'
    Invoke-Compose exec -T backend tar -czf /tmp/healthguard-files.tar.gz -C /var/www html/storage/app appdata/app.key
    Invoke-Compose cp db:/tmp/healthguard-backup.sql (Join-Path $destination 'database.sql')
    Invoke-Compose cp backend:/tmp/healthguard-files.tar.gz (Join-Path $destination 'files.tar.gz')
    Get-ChildItem -LiteralPath $destination -File | Get-FileHash -Algorithm SHA256 | Select-Object Hash,@{Name='Name';Expression={Split-Path $_.Path -Leaf}} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'checksums.json') -Encoding UTF8
} finally {
    if($previousState.Trim() -eq 'up'){Invoke-Compose exec -T backend php artisan up}
    Invoke-Compose exec -T db rm -f /tmp/healthguard-backup.sql
    Invoke-Compose exec -T backend rm -f /tmp/healthguard-files.tar.gz
}
Write-Output "Backup created: $destination. Protect this directory: it contains private records and the encryption key."

