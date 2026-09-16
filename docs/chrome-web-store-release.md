# Chrome Web Store Release

Use this workflow for an update to the existing Album Filter listing.

1. Start from clean, synchronized `main`, fetch tags, confirm CI passed, and run `npm run release:status`.
2. Confirm every user-visible change is summarized under **Unreleased** in `CHANGELOG.md` and linked to its bug when applicable. Do not add test, CI, or release-process-only work.
3. Run `npm run package:patch` to increment `manifest.json` and create the versioned ZIP in `dist/`.
4. Review and commit the manifest version bump and any pending changelog entries, push them, and confirm CI passes again.
5. Run `npm run package` so the final ZIP is generated from the tested commit.
6. In the Chrome Developer Dashboard, upload the ZIP from `dist/`. If present, copy the updated listing text from `dist/description-to-upload.txt`.
7. Immediately after the Dashboard accepts that exact ZIP, run `npm run release:record-submission` from the same clean, synchronized commit. This creates and pushes `webstore-submitted-v<version>` with the commit, ZIP path, and SHA-256 in its annotation.
8. Submit the update for review. Normal development on `main` may continue while review is pending.
9. When the submitted version is confirmed live, return to clean, synchronized `main`, fetch tags, and run `npm run release:record`. If `manifest.json` has already advanced to another version, run `npm run release:record -- <published-version>` instead. The command creates `webstore-v<version>` on the preserved submitted commit, not current `HEAD`.
10. Move the released entries from **Unreleased** to a `## [<version>] - YYYY-MM-DD` section using the date the Developer Dashboard was confirmed live, update the comparison links, then commit and push this documentation-only finalization. Use the exact publication date instead when it is known.
11. Run `npm run release:status`; it compares current runtime and listing files with the newest confirmed-live `webstore-v*` tag.

Neither bookkeeping command uploads or publishes the extension. `release:record-submission` records the package that was manually uploaded; do not run it for a ZIP that was only built locally. `release:record` is the explicit confirmation that the submitted version became public; do not run it while the update is awaiting review.

If a tag was created locally but its push failed, push only that tag:

```bash
git push origin refs/tags/webstore-submitted-v<version>
git push origin refs/tags/webstore-v<version>
```

Use the first command for a failed submission-tag push or the second for a failed publication-tag push. Inspect a submission record with `git show webstore-submitted-v<version>`; its annotation must match the ZIP actually uploaded.

Do not move or overwrite a pushed submission tag. If the accepted ZIP must be replaced, prepare a new extension version and repeat the packaging, upload, and submission-record steps.

`CHANGELOG.md` explains user-visible release contents; it is not proof of upload or publication. The annotated Web Store tag remains the publication record.
