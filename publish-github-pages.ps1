param(
  [string]$RepoName = "ox-card-study",
  [switch]$Private
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Fail "GitHub CLI (gh) is not installed. Install it and run 'gh auth login' before using this script."
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "GitHub CLI is not authenticated. Run 'gh auth login' first."
}

if (-not (Test-Path ".git")) {
  git init -b main
}

$status = git status --short
if ($status) {
  git add .
  git commit -m "Prepare OX card app for GitHub Pages"
}

$visibility = if ($Private) { "--private" } else { "--public" }
$remote = git remote get-url origin 2>$null

if (-not $remote) {
  gh repo create $RepoName $visibility --source . --remote origin --push
} else {
  git push -u origin main
}

Write-Host ""
Write-Host "Push complete."
Write-Host "Open the repository Settings > Pages and choose GitHub Actions if it is not already selected."
Write-Host "The deployed URL will appear in the GitHub Actions run for 'Deploy static site to GitHub Pages'."
