# Album Filter

Chrome extension for finding albums in long Facebook album lists by filtering titles.
See `README.md` for functionality and usage, and `tests/README.md` for test coverage and limitations.

## Collaboration

- Treat questions as questions: answer the requested explanation without assuming criticism, disagreement, or a request to reverse a recommendation or implement changes.
- Do not implement or change code unless the user requests it or approves a suggested change.
- Distinguish verified facts from assumptions. Do not present guessed UI instructions as established facts.

## Development and Testing

- Use the playground in `test/` as the only Facebook substitute for manual and automated tests; do not create separate mock Facebook pages.
- Re-read edited files after changes to confirm final content is correct.
- Recheck key regressions before committing a reported fix.
- Run the Chromium suite with `npx playwright test --project=chromium`; see `tests/README.md` for targeted runs and traces.
- When functionality, labels, or terminology change, keep `README.md` and `docs/description.txt` in sync.
- Keep this file updated when working practices change. Keep temporary progress summaries out of it.

## Git

- Before committing, review the full diff and draft a commit message covering all included changes.
- Use `origin/main` as the default push target unless the user specifies otherwise.

## Chrome Web Store Packaging

- `npm run package` creates `dist/album-filter-<version>.zip` without incrementing the version.
- `npm run package:patch` increments the patch version in `manifest.json`, then packages.
- The ZIP includes only the extension runtime files explicitly listed in `package.json`, not project documentation or tests.
- `docs/description.txt` is the source for the store listing description. Keep it concise and consistent with `README.md`.
- Packaging compares the description with `dist/.description-last`. If changed, it writes `dist/description-to-upload.txt` and updates `dist/.description-last`.
- `dist/description-to-upload.txt` persists for manual upload and may be deleted after uploading it to the store.

## Playground Deployment

- Netlify publishes `test/`; its configuration is in `netlify.toml`.
- Keep deployment instructions consistent with the actual Netlify configuration and GitHub Actions workflows. Do not assume that passing CI gates deployment unless that dependency is configured.
