<#
.SYNOPSIS
    Auto-commit dan auto-push perubahan project HealthGuard ke GitHub.

.DESCRIPTION
    Script ini memantau perubahan file di repository. Setelah perubahan stabil,
    script menjalankan git add, git commit, dan git push secara otomatis.

    Log disimpan di .git/autosync.log agar tidak ikut ter-commit.

.PARAMETER Once
    Jalankan satu kali sinkronisasi lalu keluar.

.PARAMETER Pull
    Ambil perubahan dari remote terlebih dahulu sebelum push.
    Jika ada perubahan lokal dan remote sekaligus, digunakan rebase.

.PARAMETER IntervalSeconds
    Jeda pengecekan perubahan. Default: 2 detik.

.PARAMETER DebounceSeconds
    Lama perubahan harus stabil sebelum di-commit. Default: 3 detik.

.PARAMETER Branch
    Branch yang disinkronkan. Default: main.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\auto-sync.ps1

.EXAMPLE
    git autosync

.EXAMPLE
    git autosync -Pull

.EXAMPLE
    git autosync -Once
#>

[CmdletBinding()]
param(
    [switch]$Once,
    [switch]$Pull,
    [int]$IntervalSeconds = 2,
    [int]$DebounceSeconds = 3,
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$gitDir = Join-Path $repoRoot '.git'
$logFile = Join-Path $gitDir 'autosync.log'

function Write-SyncLog {
    param([string]$Message)

    $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Invoke-Git {
    param([string[]]$GitArgs)

    # Git writes warnings to stderr. Keep them from becoming terminating
    # errors when $ErrorActionPreference is Stop.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    try {
        $output = & git @GitArgs 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output   = (($output | ForEach-Object { "$_" }) -join "`n")
    }
}

function Get-WorkTreeState {
    $result = Invoke-Git @('status', '--porcelain=v1', '--untracked-files=all')

    if ($result.ExitCode -ne 0) {
        return ''
    }

    return $result.Output
}

function Test-GitOperationInProgress {
    $markers = @('index.lock', 'rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD')

    foreach ($marker in $markers) {
        if (Test-Path -LiteralPath (Join-Path $gitDir $marker)) {
            return $true
        }
    }

    return $false
}

function Get-AheadCount {
    $result = Invoke-Git @('rev-list', '--count', "origin/$Branch..HEAD")

    if ($result.ExitCode -ne 0 -or -not $result.Output) {
        return 0
    }

    return [int]$result.Output
}

function Get-BehindCount {
    $result = Invoke-Git @('rev-list', '--count', "HEAD..origin/$Branch")

    if ($result.ExitCode -ne 0 -or -not $result.Output) {
        return 0
    }

    return [int]$result.Output
}

function Sync-Repository {
    if (Test-GitOperationInProgress) {
        Write-SyncLog 'Operasi Git lain sedang berjalan; sync dilewati.'
        return $false
    }

    $state = Get-WorkTreeState

    if ($state) {
        $add = Invoke-Git @('add', '-A')
        if ($add.ExitCode -ne 0) {
            Write-SyncLog "git add gagal: $($add.Output)"
            return $false
        }

        $staged = Invoke-Git @('diff', '--cached', '--name-only')
        if ($staged.ExitCode -ne 0) {
            Write-SyncLog "git diff gagal: $($staged.Output)"
            return $false
        }

        if ($staged.Output) {
            $message = 'auto-sync: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
            $commit = Invoke-Git @('commit', '-m', $message)

            if ($commit.ExitCode -ne 0) {
                Write-SyncLog "git commit gagal: $($commit.Output)"
                return $false
            }

            Write-SyncLog "Commit dibuat: $message"
        }
    }

    if ($Pull) {
        $fetch = Invoke-Git @('fetch', 'origin', '--prune')
        if ($fetch.ExitCode -ne 0) {
            Write-SyncLog "git fetch gagal: $($fetch.Output)"
            return $false
        }

        if ((Get-BehindCount) -gt 0) {
            if ((Get-AheadCount) -gt 0) {
                $pull = Invoke-Git @('pull', '--rebase', '--autostash', 'origin', $Branch)
            }
            else {
                $pull = Invoke-Git @('pull', '--ff-only', 'origin', $Branch)
            }

            if ($pull.ExitCode -ne 0) {
                Write-SyncLog "git pull gagal: $($pull.Output)"

                if ((Test-Path -LiteralPath (Join-Path $gitDir 'rebase-merge')) -or
                    (Test-Path -LiteralPath (Join-Path $gitDir 'rebase-apply'))) {
                    $null = Invoke-Git @('rebase', '--abort')
                    Write-SyncLog 'Rebase dibatalkan; selesaikan konflik secara manual.'
                }

                return $false
            }

            Write-SyncLog 'Perubahan remote berhasil di-pull.'
        }
    }

    $ahead = Get-AheadCount
    if ($ahead -le 0) {
        return $true
    }

    $push = Invoke-Git @('push', 'origin', "HEAD:$Branch")
    if ($push.ExitCode -ne 0) {
        Write-SyncLog "git push gagal: $($push.Output)"
        return $false
    }

    Write-SyncLog "Push berhasil: $ahead commit ke origin/$Branch."
    return $true
}

if (-not (Test-Path -LiteralPath $gitDir)) {
    throw "Folder ini bukan Git repository: $repoRoot"
}

$remoteUrl = (Invoke-Git @('remote', 'get-url', 'origin')).Output
if (-not $remoteUrl) {
    throw 'Remote origin belum diset.'
}

$userName = (Invoke-Git @('config', 'user.name')).Output
$userEmail = (Invoke-Git @('config', 'user.email')).Output
if (-not $userName -or -not $userEmail) {
    throw 'git user.name dan user.email belum dikonfigurasi.'
}

$mutexName = 'Local\HealthGuardGitAutoSync'
$mutex = New-Object System.Threading.Mutex($false, $mutexName)

try {
    $acquired = $mutex.WaitOne(0)
}
catch [System.Threading.AbandonedMutexException] {
    $acquired = $true
}

if (-not $acquired) {
    Write-Host 'Auto-sync sudah berjalan di terminal lain.'
    $mutex.Dispose()
    exit 0
}

$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

try {
    $initialFetch = Invoke-Git @('fetch', 'origin', '--prune')
    if ($initialFetch.ExitCode -ne 0) {
        Write-SyncLog "Peringatan: fetch awal gagal. $($initialFetch.Output)"
    }

    $remoteBranch = Invoke-Git @('rev-parse', '--verify', "origin/$Branch")
    if ($remoteBranch.ExitCode -ne 0) {
        throw "Branch origin/$Branch tidak ditemukan di remote."
    }

    if ($Once) {
        $synced = Sync-Repository

        if ($synced) {
            exit 0
        }

        exit 1
    }

    Write-SyncLog "Auto-sync aktif di $repoRoot (branch $Branch). Tekan Ctrl+C untuk berhenti."

    $lastState = Get-WorkTreeState
    $pendingSince = $null
    $lastSyncAttempt = [datetime]::MinValue

    while ($true) {
        Start-Sleep -Seconds $IntervalSeconds

        $currentState = Get-WorkTreeState
        $now = Get-Date
        $shouldAttempt = $false

        if ($currentState -ne $lastState) {
            $lastState = $currentState
            $pendingSince = $now
            continue
        }

        $cooldownPassed = (($now - $lastSyncAttempt).TotalSeconds -ge 30)

        if ($currentState -and $pendingSince) {
            $stableFor = ($now - $pendingSince).TotalSeconds

            if ($stableFor -ge $DebounceSeconds -and $cooldownPassed) {
                $shouldAttempt = $true
            }
        }
        elseif (-not $currentState -and (Get-AheadCount) -gt 0 -and $cooldownPassed) {
            $shouldAttempt = $true
        }

        if ($shouldAttempt) {
            $null = Sync-Repository
            $lastSyncAttempt = Get-Date
            $currentState = Get-WorkTreeState
            $lastState = $currentState

            if ($currentState) {
                $pendingSince = Get-Date
            }
            else {
                $pendingSince = $null
            }
        }
    }
}
finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
