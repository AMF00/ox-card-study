param(
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

function Normalize-ProcessPathEnvironment {
  $pathValue = [Environment]::GetEnvironmentVariable("Path", "Process")
  if (-not $pathValue) {
    $pathValue = [Environment]::GetEnvironmentVariable("PATH", "Process")
  }

  if ($pathValue) {
    [Environment]::SetEnvironmentVariable("PATH", $null, "Process")
    [Environment]::SetEnvironmentVariable("Path", $pathValue, "Process")
  }
}

Normalize-ProcessPathEnvironment

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "Node.js is required to serve the static app."
}

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  Fail "OpenSSH client is required for the localhost.run tunnel."
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $Root ".runtime"
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

$ServerOut = Join-Path $RuntimeDir "server.out.log"
$ServerErr = Join-Path $RuntimeDir "server.err.log"
$TunnelOut = Join-Path $RuntimeDir "tunnel.out.log"
$TunnelErr = Join-Path $RuntimeDir "tunnel.err.log"
$KnownHosts = Join-Path ([System.IO.Path]::GetTempPath()) "ox-card-localhost-run-known-hosts"
$LinkFile = Join-Path $Root "PHONE_LINK.txt"

Remove-Item -LiteralPath $ServerOut, $ServerErr, $TunnelOut, $TunnelErr -Force -ErrorAction SilentlyContinue

$serverArgs = @("serve-static.mjs", "--port", "$Port", "--host", "127.0.0.1")
$server = Start-Process -FilePath "node" -ArgumentList $serverArgs -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr

try {
  $serverReady = $false
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    Start-Sleep -Milliseconds 500
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $serverReady = $true
        break
      }
    } catch {
      if ($server.HasExited) {
        break
      }
    }
  }

  if (-not $serverReady) {
    $serverError = if (Test-Path $ServerErr) { Get-Content -Raw -Path $ServerErr } else { "" }
    Fail "Static server did not start on port $Port. $serverError"
  }

  $sshArgs = @(
    "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=60",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "UserKnownHostsFile=$KnownHosts",
    "-R", "80:127.0.0.1:$Port",
    "nokey@localhost.run"
  )
  $tunnel = Start-Process -FilePath "ssh" -ArgumentList $sshArgs -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput $TunnelOut -RedirectStandardError $TunnelErr

  $url = $null
  for ($attempt = 0; $attempt -lt 90; $attempt += 1) {
    Start-Sleep -Seconds 1
    $combined = ""
    if (Test-Path $TunnelOut) { $combined += Get-Content -Raw -Path $TunnelOut }
    if (Test-Path $TunnelErr) { $combined += "`n" + (Get-Content -Raw -Path $TunnelErr) }

    $matches = [regex]::Matches($combined, "https://[a-zA-Z0-9.-]+\.(?:localhost\.run|lhr\.life)")
    $candidate = $matches | ForEach-Object { $_.Value } | Where-Object { $_ -notmatch "^https://(admin|www)\.localhost\.run$" } | Select-Object -First 1
    if ($candidate) {
      $url = $candidate
      break
    }

    if ($tunnel.HasExited) {
      break
    }
  }

  if (-not $url) {
    $tunnelLog = ""
    if (Test-Path $TunnelOut) { $tunnelLog += Get-Content -Raw -Path $TunnelOut }
    if (Test-Path $TunnelErr) { $tunnelLog += "`n" + (Get-Content -Raw -Path $TunnelErr) }
    Fail "Tunnel did not return a public URL. $tunnelLog"
  }

  $status = @"
OX Card temporary phone link

URL: $url
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")
Local server PID: $($server.Id)
Tunnel PID: $($tunnel.Id)

This link works while this PC, the local server, and the SSH tunnel are running.
"@

  Set-Content -Encoding UTF8 -Path $LinkFile -Value $status

  Write-Host $url
  Write-Host "Saved link details to PHONE_LINK.txt"
} catch {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
  if ($tunnel -and -not $tunnel.HasExited) {
    Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
  }
  throw
}
