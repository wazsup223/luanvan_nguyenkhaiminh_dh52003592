$ErrorActionPreference = 'SilentlyContinue'
$outFile = "$env:TEMP\tunnel_url.txt"
$proc = Start-Process -FilePath "ssh" -ArgumentList "-o","StrictHostKeyChecking=no","-o","ServerAliveInterval=30","-o","ExitOnForwardFailure=yes","-R","80:localhost:3001","nokey@localhost.run" -NoNewWindow -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $outFile
Start-Sleep -Seconds 8
if (Test-Path $outFile) {
    $content = Get-Content $outFile -Raw
    if ($content -match 'https?://[a-z0-9]+\.localhost\.run') {
        $Matches[0]
    } else {
        Write-Host "No URL found. Content: $content"
    }
}
if (-not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
