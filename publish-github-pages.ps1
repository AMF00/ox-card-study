param(
  [string]$RepoName = "ox-card-study",
  [switch]$Private
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

function Invoke-GitHubApi($Method, $Uri, $Body = $null) {
  if (-not $env:GITHUB_TOKEN) {
    Fail "GITHUB_TOKEN is not set."
  }

  $headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $env:GITHUB_TOKEN"
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
    git init -b main
  }

  $status = git status --short
  if ($status) {
    git add .
    git commit -m "Prepare OX card app for GitHub Pages"
  }
}

function Push-WithToken($RemoteUrl) {
  $askPass = Join-Path ([System.IO.Path]::GetTempPath()) ("git-askpass-ox-card-" + [System.Guid]::NewGuid().ToString("N") + ".cmd")
  Set-Content -Encoding ASCII -Path $askPass -Value @"
@echo off
echo %* | findstr /I "Username" >nul
if %ERRORLEVEL% EQU 0 (
  echo x-access-token
) else (
  echo %GITHUB_TOKEN%
)
"@

  try {
    $env:GIT_TERMINAL_PROMPT = "0"
    $env:GIT_ASKPASS = $askPass
    git push -u $RemoteUrl main
  } finally {
    Remove-Item -LiteralPath $askPass -Force -ErrorAction SilentlyContinue
    Remove-Item Env:GIT_ASKPASS -ErrorAction SilentlyContinue
  }
}

function Get-OriginOwnerRepo {
  $origin = git remote get-url origin 2>$null
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

$visibility = if ($Private) { "--private" } else { "--public" }
$hasGh = [bool](Get-Command gh -ErrorAction SilentlyContinue)
$ghAuthenticated = $false
$hasToken = [bool]$env:GITHUB_TOKEN

if ($hasGh) {
  gh auth status *> $null
  if ($LASTEXITCODE -eq 0) {
    $ghAuthenticated = $true
  }
}

if (-not $ghAuthenticated -and -not $hasToken) {
  Fail "No authenticated GitHub path is available. Install gh and run 'gh auth login', or set GITHUB_TOKEN."
}

Ensure-GitRepository
$remote = git remote get-url origin 2>$null

if ($hasGh) {
  if ($ghAuthenticated) {
    if (-not $remote) {
      gh repo create $RepoName $visibility --source . --remote origin --push
    } else {
      git push -u origin main
    }
    $originInfo = Get-OriginOwnerRepo
    if ($originInfo) {
      Enable-PagesWithGh -Owner $originInfo.Owner -Repo $originInfo.Repo
    }
  } elseif ($hasToken) {
    Write-Host "GitHub CLI is installed but not authenticated. Falling back to GITHUB_TOKEN."
  }
}

if (-not $ghAuthenticated -and $hasToken) {
  $user = Invoke-GitHubApi -Method "GET" -Uri "https://api.github.com/user"
  $owner = $user.login
  $repoUri = "https://api.github.com/repos/$owner/$RepoName"

  try {
    Invoke-GitHubApi -Method "GET" -Uri $repoUri | Out-Null
    Write-Host "Repository already exists: $owner/$RepoName"
  } catch {
    $createBody = @{
      name = $RepoName
      private = [bool]$Private
      description = "Subject-based OX card study app"
      auto_init = $false
    }
    Invoke-GitHubApi -Method "POST" -Uri "https://api.github.com/user/repos" -Body $createBody | Out-Null
  }

  $remoteUrl = "https://github.com/$owner/$RepoName.git"
  if (-not $remote) {
    git remote add origin $remoteUrl
  }
  Push-WithToken -RemoteUrl "origin"
  Enable-PagesWithToken -Owner $owner -Repo $RepoName
} else {
  $originInfo = Get-OriginOwnerRepo
  if ($originInfo) {
    if ($env:GITHUB_TOKEN) {
      Enable-PagesWithToken -Owner $originInfo.Owner -Repo $originInfo.Repo
    }
  }
}

Write-Host ""
Write-Host "Push complete."
Write-Host "If Pages was enabled successfully, the deployed URL will appear in the GitHub Actions run for 'Deploy static site to GitHub Pages'."
