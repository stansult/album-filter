# Contributing to Album Filter

Album Filter is a Chrome extension for filtering long Facebook album lists. Keep changes focused, preserve its minimal permissions, and use the playground in `test/` as the only Facebook substitute for automated and manual testing.

## Set up the project

```bash
npm ci
npx playwright install chromium
```

Load the repository root as an unpacked extension in Chrome for manual checks. See the [README](README.md) for installation and usage.

## Verify changes

Run the complete Node tooling suite:

```bash
npm run test:unit
```

Run the complete Chromium suite:

```bash
npm run test:e2e
```

Use `npm run test:e2e:headed` to watch the complete browser suite. The HTML report is written to `playwright-report/`; traces are written beneath `test-results/` when enabled or captured for a retry. See [tests/README.md](tests/README.md) for focused commands and report/trace viewing.

Run both suites before pushing changes to extension code, configuration, workflows, the manifest, package or release tooling, playground fixtures, or tests. Recheck the relevant regression before committing a reported fix. See [tests/README.md](tests/README.md) for focused commands, coverage, limitations, traces, and the manual playground check.

Tests must exercise the real unpacked extension where extension behavior is under review. Do not create another mock Facebook page: extend the existing playground when its contract needs to grow.

### Markdown-only exception

Tests may be skipped when every changed file is ordinary Markdown that is not consumed by automation or artifact generation. Before using this exception:

1. Run `git diff --check`.
2. Confirm every changed file is Markdown.
3. Review the complete diff and rendered wording.
4. Verify every referenced local link resolves.

Document the exception when handing off the change.

## Keep public documentation synchronized

When functionality, labels, terminology, capabilities, or limitations change, update `README.md`, the Chrome Web Store listing source at `docs/description.txt`, and the **Unreleased** section of `CHANGELOG.md` as applicable. Keep the permanent store description focused on current behavior; use the changelog for release-specific history and link the relevant bug when available.

Canonical project documentation:

- [Test coverage and limitations](tests/README.md)
- [Bug reporting and lifecycle](docs/bug-reporting.md)
- [User-visible changelog](CHANGELOG.md)
- [Playground deployment](docs/deployment.md)
- [Chrome Web Store release workflow](docs/chrome-web-store-release.md)
- [Release-bookkeeping approach](docs/release-bookkeeping-approach.md)
- [Privacy policy](PRIVACY.md)

Report reproducible problems through the [bug-report form and lifecycle](docs/bug-reporting.md). Preserve reproduction, regression, fix, release, and live-verification evidence when applicable.

## Review and commit

Before committing:

1. Reread every edited file.
2. Review the complete diff, including newly added files.
3. Confirm verification is proportionate to the change and required suites passed.
4. Draft a commit message that accounts for every included change.

Use `origin/main` as the default push target unless the work explicitly requires another destination. Preserve unrelated working-tree changes and never include temporary progress or conversation summaries in a commit.

## Deployment and releases

Netlify publishes only the playground in `test/`; it does not publish the Chrome extension. Follow the [test-gated deployment guide](docs/deployment.md) and keep it consistent with `netlify.toml` and the GitHub Actions workflow.

For Chrome Web Store packages, follow the [release workflow](docs/chrome-web-store-release.md). Treat package creation, submission for review, and confirmed publication as separate states. Record a published release only after the Developer Dashboard shows that version as live.
