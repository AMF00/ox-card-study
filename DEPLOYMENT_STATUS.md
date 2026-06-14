# Deployment Status

## Current state

- Local static app is complete.
- Git repository is initialized on `main`.
- Local commits exist for the app and deployment preparation; use `git log -1 --oneline` for the current latest commit.
- GitHub Pages workflow exists at `.github/workflows/pages.yml`.
- `publish-github-pages.ps1` can publish with either an authenticated GitHub CLI session or a `GITHUB_TOKEN`.
- Mobile install metadata exists in `manifest.webmanifest` and `favicon.svg`.
- Working tree was clean before this status/script update.

## Verified locally

- `node --check app.js` passed.
- `manifest.webmanifest` parsed as JSON.
- `sample-deck.json` parsed as JSON.
- HTML references `manifest.webmanifest` and `favicon.svg`.
- GitHub Pages workflow uploads the repository root and deploys with GitHub Pages actions.

## External deployment blocker

I could not create the GitHub repository or push the branch autonomously because no authenticated GitHub path is currently available in this environment:

- `gh` is not installed.
- No `GITHUB_TOKEN` or other matching deployment token environment variable is present.
- GitHub credential lookup returned no saved username or secret when interactive prompts were disabled.
- Browser access to `https://github.com/new` redirects to the GitHub sign-in page.

## Ready-to-run next step

After GitHub CLI is installed and authenticated, or after `GITHUB_TOKEN` is set, run this from the project folder:

```powershell
.\publish-github-pages.ps1
```

The script creates a public repository named `ox-card-study` by default, pushes `main`, and lets the included GitHub Pages workflow deploy the app.
