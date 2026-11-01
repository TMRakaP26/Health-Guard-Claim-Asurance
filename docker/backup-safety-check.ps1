$ErrorActionPreference='Stop'
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('healthguard-backup-check-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture | Out-Null
# These negative cases must fail before any Docker call or target mutation.
function docker { throw 'Unexpected Docker invocation during backup validation' }
function Assert-Rejected([string]$Expected) {
    try {
        & "$PSScriptRoot/restore.ps1" -Project healthguard-validation-only -BackupDirectory $fixture -ConfirmRestore
    } catch {
        if($_.Exception.Message -like "$Expected*"){return}
        throw
    }
    throw 'An invalid backup was accepted'
}
try {
    $manifest=Join-Path $fixture 'checksums.json'
    '[]' | Set-Content -LiteralPath $manifest -Encoding UTF8
    Assert-Rejected 'Backup must contain checksums'

    @(@{Name='database.sql';Hash='invalid'},@{Name='database.sql';Hash='invalid'}) | ConvertTo-Json | Set-Content -LiteralPath $manifest -Encoding UTF8
    Assert-Rejected 'Backup must contain checksums'

    'test database' | Set-Content -LiteralPath (Join-Path $fixture 'database.sql') -Encoding UTF8
    'test archive' | Set-Content -LiteralPath (Join-Path $fixture 'files.tar.gz') -Encoding UTF8
    @(@{Name='database.sql';Hash='invalid'},@{Name='files.tar.gz';Hash='invalid'}) | ConvertTo-Json | Set-Content -LiteralPath $manifest -Encoding UTF8
    Assert-Rejected 'Backup checksum mismatch'
    Write-Output 'PASS: incomplete, duplicate and corrupted backup manifests are rejected before Docker is invoked.'
} finally {
    $resolved=(Resolve-Path -LiteralPath $fixture).Path
    $tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar)+[IO.Path]::DirectorySeparatorChar
    if(-not $resolved.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -or (Split-Path $resolved -Leaf) -notlike 'healthguard-backup-check-*'){throw 'Refusing to remove an unexpected fixture path'}
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
