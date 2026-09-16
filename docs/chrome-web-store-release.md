# Chrome Web Store Release

Use this workflow for an update to the existing Album Filter listing.

1. Start from clean, synchronized `main`, confirm CI passed, and run `npm run release:status`.
2. Confirm every user-visible change is summarized under **Unreleased** in `CHANGELOG.md` and linked to its bug when applicable. Do not add test, CI, or release-process-only work.
3. Run `npm run package:patch` to increment `manifest.json` and create the versioned ZIP in `dist/`.
4. Review and commit the manifest version bump and any pending changelog entries, push them, and confirm CI passes again.
5. Run `npm run package` so the final ZIP is generated from the tested commit.
6. In the Chrome Developer Dashboard, upload the ZIP from `dist/`. If present, copy the updated listing text from `dist/description-to-upload.txt`.
7. Submit the update for review and wait until that version is live.
8. From the same clean, synchronized `main` commit, run `npm run release:record`. This creates and pushes the annotated tag `webstore-v<version>`.
9. Move the released entries from **Unreleased** to a `## [<version>] - YYYY-MM-DD` section using the date the Developer Dashboard was confirmed live, update the comparison links, then commit and push this documentation-only finalization. Use the exact publication date instead when it is known. Do this after recording the tag so the tag still identifies the exact package commit.
10. Run `npm run release:status`; runtime files and the store description should both report `unchanged`.

`release:record` is the explicit confirmation that a version became public. Do not run it when a package is merely built, uploaded, or awaiting review. If its tag push fails after the local tag is created, push that tag with `git push origin refs/tags/webstore-v<version>`.

`CHANGELOG.md` explains user-visible release contents; it is not proof of upload or publication. The annotated Web Store tag remains the publication record.
