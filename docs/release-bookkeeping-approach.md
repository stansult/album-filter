# Chrome Web Store Release Bookkeeping Approach

This project uses annotated Git tags to preserve both the package submitted to the Chrome Web Store and the repository commit later confirmed live. Upload, final publication confirmation, and live behavioral verification remain manual. Submission-scoped polling detects when Google's extension-update service begins serving the submitted version, while the evidence stays durable and easy to compare.

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

`release:record-submission` reads the version from `manifest.json`, hashes `dist/album-filter-<version>.zip`, creates its annotated submission tag on `HEAD`, and pushes only that tag to `origin`. After the tag push succeeds, it enables `webstore-publication.yml` and dispatches an immediate publication check.

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
- GitHub CLI to be installed and authenticated
- `webstore-publication.yml` to be visible in `stansult/album-filter`

Submission tags are immutable evidence. If an accepted ZIP is replaced, use a new extension version and create a new submission record rather than moving or overwriting the existing tag.

Publication recording also requires:

- A matching submission tag
- No existing publication tag for that version

These checks validate local and remote-tracking state. Fetch `main` and tags before recording when either may be stale.

GitHub CLI preflight runs before tag creation. Workflow activation runs only after the submission
tag is pushed. If activation then fails, the tag remains valid evidence and the command reports
partial success with these recovery commands:

```bash
gh workflow enable webstore-publication.yml --repo stansult/album-filter
gh workflow run webstore-publication.yml --repo stansult/album-filter
```

Do not rerun `release:record-submission` after its tag has been pushed. Repeating both workflow
commands is safe if enabling succeeded but dispatching failed.

If a tag is created locally but its push fails, retry only the relevant tag push:

```bash
git push origin refs/tags/webstore-submitted-v<version>
git push origin refs/tags/webstore-v<version>
```

## Publication polling

`.github/workflows/webstore-publication.yml` is normally disabled, so its six-hour schedule does
not create idle runs. Submission recording enables it and dispatches an immediate check.

The checker finds the highest `webstore-submitted-v<version>` without a matching
`webstore-v<version>`, then queries Google's extension-update service for Album Filter's live
package version. A live version equal to or newer than the submission is reported as publication
detected. After the job summary succeeds, the workflow disables itself again.

The checker does not create publication tags, close issues, or verify extension behavior. Album
Filter has no automated release-issue notification or same-version resubmission process. If
reporting or self-disable fails, the workflow remains enabled so the failed run can be inspected or
retried.

## Release sequence

1. Finish the extension changes and changelog entry, increment the manifest version, and confirm CI passes on synchronized `main`.
2. Generate and verify the final ZIP from that commit.
3. Upload that ZIP in the Developer Dashboard.
4. Immediately run `npm run release:record-submission` from the same commit. It records the submission, enables polling, and dispatches an immediate check.
5. Submit the update for review. Development on `main` may now continue while scheduled checks run.
6. When polling detects publication, verify the live version and behavior; the successful detection run disables polling.
7. From clean, synchronized `main`, fetch tags and run `npm run release:record` with an explicit version argument if the manifest has advanced.
8. Finalize the version and confirmed-live date in `CHANGELOG.md`, then commit and push that documentation-only update. Use the exact publication date instead when it is known.
9. Run `npm run release:status`; runtime and listing files are compared with the newly recorded live commit.

## Files used in Album Filter

- `scripts/release-bookkeeping.cjs`: status, submission, and publication implementation
- `scripts/release-bookkeeping.test.cjs`: version, comparison, tagging, and safety-check tests
- `scripts/webstore-publication-check.cjs`: pending-submission and live-version detection
- `scripts/webstore-publication-check.test.cjs`: tag, update-response, and detection tests
- `scripts/workflow-routing.test.cjs`: publication-workflow structure contract
- `.github/workflows/webstore-publication.yml`: disabled-between-releases publication polling
- `package.json`: `release:status`, `release:record-submission`, and `release:record` commands
- `CHANGELOG.md`: user-visible release history
- `docs/chrome-web-store-release.md`: project-specific operational release workflow
- `manifest.json`: authoritative Chrome extension version
- `docs/description.txt`: source for the Web Store description

To adopt this in another extension, customize the runtime and listing files, default branch, remote, repository, extension ID, workflow behavior, resubmission rules, and issue-notification conventions. Do not assume another extension uses Album Filter's submission-only process.

## Limitations

- Google update-service polling reports the package version Chrome can install; it does not create the human-confirmed publication record or prove live behavior.
- The SHA-256 identifies the ZIP bytes recorded as uploaded, but cannot independently prove what the Dashboard received.
- The `origin/main` check uses the local remote-tracking reference. Fetch before recording if it may be stale.
