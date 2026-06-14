# Deployment Status

## Current state

- GitHub Pages fixed URL is live.
- Repository: `https://github.com/AMF00/ox-card-study`
- Pages URL: `https://amf00.github.io/ox-card-study/`
- Repository visibility: public
- Default branch: `main`
- Pages build type: GitHub Actions workflow
- Pages HTTPS enforcement: enabled

## Verified

- `node --check app.js` passed before deployment.
- `manifest.webmanifest` parsed as JSON before deployment.
- `sample-deck.json` parsed as JSON before deployment.
- `.github/workflows/pages.yml` exists and deploys the repository root.
- GitHub repository `AMF00/ox-card-study` exists.
- Git remote `origin` points to `https://github.com/AMF00/ox-card-study.git`.
- GitHub Pages API reports `html_url` as `https://amf00.github.io/ox-card-study/`.
- Public Pages root URL returns HTTP 200.
- Public Pages root HTML contains `<title>학습 카드</title>`.
- Public Pages asset checks returned HTTP 200 for:
  - `styles.css`
  - `app.js`
  - `manifest.webmanifest`
  - `favicon.svg`
  - `sample-deck.json`

## Notes

- The app is public because GitHub Pages serves static files publicly.
- User-created cards and study history remain in each browser's `localStorage`.
- PC and phone browser data are not automatically synchronized.
- Move card data between devices with the app's JSON export/import.
