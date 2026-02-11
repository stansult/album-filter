# Album Filter (Starter Scaffold)

This folder is a reusable Chrome extension starter extracted from another project.

## Included

- Manifest v3 setup (`manifest.json`)
- Background worker message flow (`background.js`)
- Popup entrypoint (`popup.html`, `popup.js`)
- Options page and storage wiring (`options.html`, `options.css`, `options.js`)
- Content script stub (`content.js`)
- Packaging scripts (`npm run package`, `npm run package:patch`)
- Chrome Web Store description workflow (`docs/description.txt` + `dist/description-to-upload.txt` behavior)

## Quick start

1. Install Node.js (LTS recommended)
2. Run `npm run package` to create a zip in `dist/`
3. Load unpacked extension from this folder in `chrome://extensions`

## Notes

- This scaffold is intentionally generic; replace stubs with project-specific logic.
- See `docs/handoff.txt` for maintenance/process conventions.
