$ErrorActionPreference = 'Continue'
$backendDir = 'C:\Users\This PC\.qclaw\workspace\FastFood_Project\backend'
$backend = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru -RedirectStandardOutput "$backendDir\stdout.log" -RedirectStandardError "$backendDir\stderr.log"
Start-Sleep -Seconds 6
Write-Host "Backend PID: $($backend.Id)"
