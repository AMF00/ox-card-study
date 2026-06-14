param(
  [string]$LogPath = ".\.runtime\tunnel.out.log"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResolvedLogPath = if ([System.IO.Path]::IsPathRooted($LogPath)) {
  $LogPath
} else {
  Join-Path $Root $LogPath
}
$LinkFile = Join-Path $Root "PHONE_LINK.txt"

if (-not (Test-Path -LiteralPath $ResolvedLogPath)) {
  throw "Tunnel log not found: $ResolvedLogPath"
}

$content = Get-Content -Raw -LiteralPath $ResolvedLogPath
$matches = [regex]::Matches($content, "https://[a-zA-Z0-9.-]+\.(?:localhost\.run|lhr\.life)")
$url = $matches |
  ForEach-Object { $_.Value } |
  Where-Object { $_ -notmatch "^https://(admin|www)\.localhost\.run$" } |
  Select-Object -Last 1

if (-not $url) {
  throw "No public localhost.run URL was found in $ResolvedLogPath"
}

$existing = if (Test-Path -LiteralPath $LinkFile) {
  Get-Content -Raw -LiteralPath $LinkFile
} else {
  ""
}

$serverPid = if ($existing -match "Local server PID:\s*(\d+)") { $Matches[1] } else { "" }
$tunnelPid = if ($existing -match "Tunnel PID:\s*(\d+)") { $Matches[1] } else { "" }

$status = @"
OX Card temporary phone link

URL: $url
Refreshed: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")
Local server PID: $serverPid
Tunnel PID: $tunnelPid

This link works while this PC, the local server, and the SSH tunnel are running.
"@

Set-Content -Encoding UTF8 -LiteralPath $LinkFile -Value $status
Write-Host $url
