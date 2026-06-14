param(
  [string[]]$Files = @(
    "index.html",
    "styles.css",
    "app.js",
    "sample-deck.json",
    "manifest.webmanifest",
    "favicon.svg"
  ),
  [string]$ApiBase = "https://api.netlify.com/api/v1"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutputFile = Join-Path $Root "NETLIFY_DROP_LINK.txt"

function Get-Sha1Hex([byte[]]$Bytes) {
  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  try {
    $hash = $sha1.ComputeHash($Bytes)
    return -join ($hash | ForEach-Object { $_.ToString("x2") })
  } finally {
    $sha1.Dispose()
  }
}

function ConvertTo-DeployPath([string]$RelativePath) {
  $path = ($RelativePath -replace "\\", "/").TrimStart("/")
  return "/" + $path
}

function ConvertTo-UrlPath([string]$DeployPath) {
  $segments = $DeployPath.TrimStart("/") -split "/"
  return "/" + (($segments | ForEach-Object { [System.Uri]::EscapeDataString($_) }) -join "/")
}

function Invoke-NetlifyJson($Method, $Uri, $Body = $null, $Headers = @{}) {
  $requestHeaders = @{"Content-Type" = "application/json"}
  foreach ($key in $Headers.Keys) {
    $requestHeaders[$key] = $Headers[$key]
  }

  $params = @{
    Method = $Method
    Uri = $Uri
    Headers = $requestHeaders
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
  }

  Invoke-RestMethod @params
}

$entries = @()
$fileMap = @{}

foreach ($relativePath in $Files) {
  $fullPath = Join-Path $Root $relativePath
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    throw "Required deploy file not found: $relativePath"
  }

  $bytes = [System.IO.File]::ReadAllBytes($fullPath)
  $deployPath = ConvertTo-DeployPath $relativePath
  $sha = Get-Sha1Hex $bytes
  $fileMap[$deployPath] = $sha
  $entries += [pscustomobject]@{
    Path = $deployPath
    Sha = $sha
    Bytes = $bytes
  }
}

$tokenResponse = Invoke-NetlifyJson -Method "POST" -Uri "$ApiBase/drop/token" -Body @{}
$token = $tokenResponse.token
if (-not $token) {
  throw "Netlify Drop did not return an upload token."
}

$dropResponse = Invoke-NetlifyJson -Method "POST" -Uri "$ApiBase/drop" -Body @{
  files = $fileMap
  token = $token
}

$deployId = if ($dropResponse.deploy_id) { $dropResponse.deploy_id } else { $dropResponse.id }
if (-not $deployId) {
  throw "Netlify Drop did not return a deploy id."
}

$required = @{}
if ($dropResponse.required) {
  foreach ($sha in $dropResponse.required) {
    $required[$sha] = $true
  }
}

foreach ($entry in $entries) {
  if ($required.Count -gt 0 -and -not $required.ContainsKey($entry.Sha)) {
    continue
  }

  $uploadPath = ConvertTo-UrlPath $entry.Path
  $uploadUri = "$ApiBase/deploys/$deployId/files$uploadPath"
  Invoke-RestMethod `
    -Method "PUT" `
    -Uri $uploadUri `
    -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/octet-stream" } `
    -Body $entry.Bytes | Out-Null
}

$subdomain = $dropResponse.subdomain
$site = $null
if ($subdomain) {
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    Start-Sleep -Seconds 1
    try {
      $site = Invoke-RestMethod -Method "GET" -Uri "$ApiBase/sites/$subdomain.netlify.app"
      if ($site.deploy_id) {
        break
      }
    } catch {
      if ($attempt -eq 59) {
        throw
      }
    }
  }
}

$url = if ($site -and $site.ssl_url) {
  $site.ssl_url
} elseif ($site -and $site.url) {
  $site.url -replace "^http://", "https://"
} elseif ($subdomain) {
  "https://$subdomain.netlify.app"
} else {
  $dropResponse.url -replace "^http://", "https://"
}

if (-not $url) {
  throw "Netlify Drop deploy completed but no site URL was returned."
}

$status = @"
OX Card Netlify Drop link

URL: $url
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")
Deploy ID: $deployId

Anonymous Netlify Drop links are temporary. Netlify may require the password shown by Drop for anonymous projects: My-Drop-Site
"@

Set-Content -Encoding UTF8 -LiteralPath $OutputFile -Value $status
Write-Host $url
Write-Host "Saved link details to NETLIFY_DROP_LINK.txt"
