$ErrorActionPreference = "SilentlyContinue"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LinkFile = Join-Path $Root "PHONE_LINK.txt"

if (-not (Test-Path $LinkFile)) {
  Write-Host "No PHONE_LINK.txt found."
  exit 0
}

$content = Get-Content -Raw -Path $LinkFile
$pids = [regex]::Matches($content, "PID: (\d+)") | ForEach-Object { [int]$_.Groups[1].Value }

foreach ($pid in $pids) {
  Stop-Process -Id $pid -Force
}

Write-Host "Stopped phone link processes."
