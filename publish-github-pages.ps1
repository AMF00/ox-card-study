param(
  [string]$RepoName = "ox-card-study",
  [switch]$Private,
  [int]$PagesWaitSeconds = 240
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path ".").Path
$AuthMode = $null
$GitHubToken = $null

function Fail($Message) {
  Write-Error $Message
  exit 1
}

function Get-GitHubToken {
  if ($env:GITHUB_TOKEN) {
    return $env:GITHUB_TOKEN
  }
  if ($env:GH_TOKEN) {
    return $env:GH_TOKEN
  }
  return $null
}

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  & git -c "safe.directory=$RepoRoot" @GitArgs
  if ($LASTEXITCODE -ne 0) {
    Fail "git $($GitArgs -join ' ') failed."
  }
}

function Get-GitOutput {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  $output = & git -c "safe.directory=$RepoRoot" @GitArgs 2>$null
  if ($LASTEXITCODE -ne 0) {
    return $null
  }
  return $output
}

function Invoke-GitHubApi($Method, $Uri, $Body = $null) {
  if (-not $GitHubToken) {
    Fail "Neither GITHUB_TOKEN nor GH_TOKEN is set."
  }

  $headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $GitHubToken"
    "X-GitHub-Api-Version" = "2022-11-28"
  }

  $parameters = @{
    Method = $Method
    Uri = $Uri
    Headers = $headers
  }

  if ($null -ne $Body) {
    $parameters.ContentType = "application/json"
    $parameters.Body = ($Body | ConvertTo-Json -Depth 10)
  }

  Invoke-RestMethod @parameters
}

function Ensure-GitRepository {
  if (-not (Test-Path ".git")) {
    Invoke-Git init -b main
  }

  $status = Get-GitOutput status --short
  if ($status) {
    Invoke-Git add .
    Invoke-Git commit -m "Prepare study card app for GitHub Pages"
  }
}

function Push-WithToken($RemoteName) {
  $askPass = Join-Path ([System.IO.Path]::GetTempPath()) ("git-askpass-study-card-" + [System.Guid]::NewGuid().ToString("N") + ".cmd")
  Set-Content -Encoding ASCII -Path $askPass -Value @"
@echo off
echo %* | findstr /I "Username" >nul
if %ERRORLEVEL% EQU 0 (
  echo x-access-token
) else (
  echo %PUBLISH_GITHUB_TOKEN%
)
"@

  try {
    $env:GIT_TERMINAL_PROMPT = "0"
    $env:GIT_ASKPASS = $askPass
    $env:PUBLISH_GITHUB_TOKEN = $GitHubToken
    Invoke-Git push -u $RemoteName main
  } finally {
    Remove-Item -LiteralPath $askPass -Force -ErrorAction SilentlyContinue
    Remove-Item Env:GIT_ASKPASS -ErrorAction SilentlyContinue
    Remove-Item Env:PUBLISH_GITHUB_TOKEN -ErrorAction SilentlyContinue
  }
}

function Get-OriginOwnerRepo {
  $origin = Get-GitOutput remote get-url origin
  if ($origin -match "github.com[:/](?<owner>[^/]+)/(?<repo>.+?)(?:\.git)?$") {
    return @{
      Owner = $Matches.owner
      Repo = $Matches.repo
    }
  }

  return $null
}

function Enable-PagesWithGh($Owner, $Repo) {
  gh api -X POST "repos/$Owner/$Repo/pages" -f build_type=workflow *> $null
  if ($LASTEXITCODE -ne 0) {
    gh api -X PUT "repos/$Owner/$Repo/pages" -f build_type=workflow *> $null
  }
}

function Enable-PagesWithToken($Owner, $Repo) {
  $pagesUri = "https://api.github.com/repos/$Owner/$Repo/pages"
  $body = @{ build_type = "workflow" }

  try {
    Invoke-GitHubApi -Method "POST" -Uri $pagesUri -Body $body | Out-Null
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 409 -or $statusCode -eq 422) {
      Invoke-GitHubApi -Method "PUT" -Uri $pagesUri -Body $body | Out-Null
    } else {
      throw
    }
  }
}

function Get-PagesInfo($Owner, $Repo) {
  try {
    if ($AuthMode -eq "gh") {
      $raw = gh api "repos/$Owner/$Repo/pages"
      if ($LASTEXITCODE -ne 0 -or -not $raw) {
        return $null
      }
      return $raw | ConvertFrom-Json
    }

    return Invoke-GitHubApi -Method "GET" -Uri "https://api.github.com/repos/$Owner/$Repo/pages"
  } catch {
    return $null
  }
}

function Wait-ForPages($Owner, $Repo, $TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $pages = Get-PagesInfo -Owner $Owner -Repo $Repo
    if ($pages -and $pages.html_url) {
      return $pages
    }
    Start-Sleep -Seconds 5
  } while ((Get-Date) -lt $deadline)

  return $null
}

function Wait-ForPublicUrl($Url, $TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Get -TimeoutSec 15
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 6
    }
  } while ((Get-Date) -lt $deadline)

  return $false
}

$visibility = if ($Private) { "--private" } else { "--public" }
$hasGh = [bool](Get-Command gh -ErrorAction SilentlyContinue)
$ghAuthenticated = $false
$GitHubToken = Get-GitHubToken
$hasToken = [bool]$GitHubToken

if ($hasGh) {
  gh auth status *> $null
  if ($LASTEXITCODE -eq 0) {
    $ghAuthenticated = $true
    $AuthMode = "gh"
  }
}

if (-not $ghAuthenticated -and $hasToken) {
  $AuthMode = "token"
}

if (-not $AuthMode) {
  Fail "No authenticated GitHub path is available. Install GitHub CLI and run 'gh auth login', or set GITHUB_TOKEN/GH_TOKEN."
}

Ensure-GitRepository
$remote = Get-GitOutput remote get-url origin
$owner = $null
$repo = $null

if ($AuthMode -eq "gh") {
  if (-not $remote) {
    gh repo create $RepoName $visibility --source . --remote origin
    if ($LASTEXITCODE -ne 0) {
      Fail "gh repo create failed."
    }
  }

  Invoke-Git push -u origin main
  $originInfo = Get-OriginOwnerRepo
  if (-not $originInfo) {
    Fail "Could not determine owner/repo from origin remote."
  }
  $owner = $originInfo.Owner
  $repo = $originInfo.Repo
  Enable-PagesWithGh -Owner $owner -Repo $repo
}

if ($AuthMode -eq "token") {
  $user = Invoke-GitHubApi -Method "GET" -Uri "https://api.github.com/user"
  $owner = $user.login
  $repo = $RepoName
  $repoUri = "https://api.github.com/repos/$owner/$RepoName"

  try {
    Invoke-GitHubApi -Method "GET" -Uri $repoUri | Out-Null
    Write-Host "Repository already exists: $owner/$RepoName"
  } catch {
    $createBody = @{
      name = $RepoName
      private = [bool]$Private
      description = "Subject-based study card app"
      auto_init = $false
    }
    Invoke-GitHubApi -Method "POST" -Uri "https://api.github.com/user/repos" -Body $createBody | Out-Null
  }

  $remoteUrl = "https://github.com/$owner/$RepoName.git"
  if (-not $remote) {
    Invoke-Git remote add origin $remoteUrl
  }
  Push-WithToken -RemoteName "origin"
  Enable-PagesWithToken -Owner $owner -Repo $repo
}

$pages = Wait-ForPages -Owner $owner -Repo $repo -TimeoutSeconds $PagesWaitSeconds
$pageUrl = if ($pages -and $pages.html_url) { $pages.html_url } else { "https://$owner.github.io/$repo/" }
$isLive = Wait-ForPublicUrl -Url $pageUrl -TimeoutSeconds $PagesWaitSeconds

Write-Host ""
Write-Host "Push complete: $owner/$repo"
Write-Host "Pages URL: $pageUrl"

if ($isLive) {
  Write-Host "Pages verification: live"
} else {
  Write-Host "Pages verification: pending. GitHub may still be building the first deployment."
}
