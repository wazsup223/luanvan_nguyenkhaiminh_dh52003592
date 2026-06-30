# Keep tunnel alive + save URL to file
$outFile = "$env:TEMP\tunnel_stdout.txt"
$errFile = "$env:TEMP\tunnel_stderr.txt"
$urlFile = "$env:TEMP\tunnel_url.txt"
Remove-Item $outFile,$errFile,$urlFile -ErrorAction SilentlyContinue

$p = Start-Process -FilePath "ssh" `
  -ArgumentList "-t","-o","StrictHostKeyChecking=no","-o","ServerAliveInterval=30","-R","80:localhost:3001","nokey@localhost.run" `
  -NoNewWindow -PassThru `
  -RedirectStandardOutput $outFile `
  -RedirectStandardError $errFile

Start-Sleep -Seconds 10

if (Test-Path $outFile) {
  $raw = Get-Content $outFile -Raw
  $clean = $raw -replace '\x1b\[[0-9;]*[a-zA-Z]','' -replace '\x1b\(B','' -replace '\[7m|\[27m|\[0m|\[49m',''
  Write-Host "=== RAW OUTPUT ==="
  Write-Host $clean
  
  if ($clean -match 'https?://[a-z0-9.-]+\.lhr\.life') {
    $url = $Matches[0]
    Write-Host "=== TUNNEL URL ==="
    Write-Host $url
    $url | Out-File -FilePath $urlFile -Encoding UTF8
  }
}

if (-not $p.HasExited) {
  Write-Host "Tunnel PID: $($p.Id)"
  $p.Id | Out-File "$env:TEMP\tunnel_pid.txt"
} else {
  Write-Host "Tunnel process died! Exit code: $($p.ExitCode)"
  if (Test-Path $errFile) { Get-Content $errFile }
}
