# Chrome Web Store Release Bookkeeping Approach

This project uses annotated Git tags to preserve both the package submitted to the Chrome Web Store and the repository commit later confirmed live. Upload, review, and publication remain manual, while the evidence is durable and easy to compare.

## Problem it solves

A manifest version or locally generated ZIP does not prove that a release was published. Packaging may happen several times, an upload may remain under review, and ignored `dist/` files are local to one machine.

The submission record is:

```text
webstore-submitted-v<manifest version>
```

It targets the exact commit used to build the uploaded ZIP. Its annotation contains that commit, the ZIP path, and the ZIP's SHA-256 checksum.

The later publication record is:

```text
webstore-v<manifest version>
```

It is created only after the Developer Dashboard shows the submitted version as live, and it targets the commit preserved by the matching submission tag. This prevents unrelated work added to `main` during review from being labeled as published.

`webstore-v0.1.5` predates submission markers and remains unchanged. Submission records begin with the next package uploaded after this process was introduced; no retroactive `webstore-submitted-v0.1.5` tag is needed.

`CHANGELOG.md` serves a different purpose: it summarizes user-visible changes by release. A changelog entry does not prove that a package was uploaded or published.

## Core rule

Create a submission tag only after the Dashboard accepts the exact ZIP. Create a publication tag only after that version is confirmed live. Building a ZIP locally is neither submission nor publication.

## Commands

Three npm commands wrap the bookkeeping:

```bash
npm run release:status
npm run release:record-submission
npm run release:record
```

`release:status` finds the highest `webstore-v*` tag and compares it with `HEAD`. It reports separately whether extension runtime files and store-listing source files have changed since the recorded release.

`release:record-submission` reads the version from `manifest.json`, hashes `dist/album-filter-<version>.zip`, creates its annotated submission tag on `HEAD`, and pushes only that tag to `origin`.

`release:record` reads the version from `manifest.json`, resolves the matching submission tag to its commit, creates the publication tag on that commit, and pushes only the publication tag. If `manifest.json` has advanced during review, pass the version explicitly with `npm run release:record -- <published-version>`.

## Safety checks

Both record commands require:

- A valid one-to-four-part Chrome extension version
- A clean working tree
- The current branch to be `main`
- `HEAD` to match the local `origin/main` tracking reference
- A version newer than every previously recorded Web Store version

Submission recording also requires:

- The versioned ZIP to exist at the expected `dist/` path
- No existing submission or publication tag for that version

Submission tags are immutable evidence. If an accepted ZIP is replaced, use a new extension version and create a new submission record rather than moving or overwriting the existing tag.

Publication recording also requires:

- A matching submission tag
- No existing publication tag for that version

These checks validate local and remote-tracking state. Fetch `main` and tags before recording when either may be stale.

If a tag is created locally but its push fails, retry only the relevant tag push:

```bash
git push origin refs/tags/webstore-submitted-v<version>
git push origin refs/tags/webstore-v<version>
```

## Release sequence

1. Finish the extension changes and changelog entry, increment the manifest version, and confirm CI passes on synchronized `main`.
2. Generate and verify the final ZIP from that commit.
3. Upload that ZIP in the Developer Dashboard.
4. Immediately run `npm run release:record-submission` from the same commit.
5. Submit the update for review. Development on `main` may now continue.
6. Wait until the submitted version is shown as published/live.
7. From clean, synchronized `main`, fetch tags and run `npm run release:record` with an explicit version argument if the manifest has advanced.
8. Finalize the version and confirmed-live date in `CHANGELOG.md`, then commit and push that documentation-only update. Use the exact publication date instead when it is known.
9. Run `npm run release:status`; runtime and listing files are compared with the newly recorded live commit.

## Files used in Album Filter

- `scripts/release-bookkeeping.cjs`: status, submission, and publication implementation
- `scripts/release-bookkeeping.test.cjs`: version, comparison, tagging, and safety-check tests
- `package.json`: `release:status`, `release:record-submission`, and `release:record` commands
- `CHANGELOG.md`: user-visible release history
- `docs/chrome-web-store-release.md`: project-specific operational release workflow
- `manifest.json`: authoritative Chrome extension version
- `docs/description.txt`: source for the Web Store description

To adopt this in another extension, copy the bookkeeping script and tests, add the npm commands, and customize the `runtimeFiles`, `listingFiles`, default branch, and remote name if that project differs.

## Limitations

- The tags record human-confirmed upload and publication events; they do not query the Chrome Web Store API.
- The SHA-256 identifies the ZIP bytes recorded as uploaded, but cannot independently prove what the Dashboard received.
- The `origin/main` check uses the local remote-tracking reference. Fetch before recording if it may be stale.
