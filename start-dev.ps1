$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

function Stop-ProcessesOnPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($procId in $pids) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
        } catch {
            Write-Warning "Failed to stop process $procId on port $Port. $($_.Exception.Message)"
        }
    }
}

Stop-ProcessesOnPort -Port 3000
Stop-ProcessesOnPort -Port 5173

if (-not (Test-Path (Join-Path $backendDir "package.json"))) {
    throw "Missing backend/package.json in $backendDir"
}

if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
    throw "Missing frontend/package.json in $frontendDir"
}

$backendCmd = "npm run dev"
$frontendCmd = "npm run dev"

Start-Process powershell -WorkingDirectory $backendDir -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Process powershell -WorkingDirectory $frontendDir -ArgumentList "-NoExit", "-Command", $frontendCmd
