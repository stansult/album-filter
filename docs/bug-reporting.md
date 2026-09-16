# Bug Reporting and Lifecycle

Use the [Album Filter bug-report form](https://github.com/stansult/album-filter/issues/new?template=bug_report.yml) for reproducible incorrect behavior. Search [existing issues](https://github.com/stansult/album-filter/issues) first. A blank issue remains available for proposals and work that is not a bug.

Do not include private Facebook album names, photos, profile or album URLs, account details, credentials, or other personal data. Use placeholders such as `facebook.com/<user>/photos_albums` and sanitize screenshots, recordings, logs, and traces.

## Triage

Maintainers first confirm the affected surface, version or commit, environment, reproduction steps, expected behavior, actual behavior, and frequency. Reproduce against the smallest appropriate target:

- use the real unpacked extension for extension behavior;
- use `test/` as the only Facebook substitute for automated or manual regression work;
- verify the playground independently when an extension scenario depends on its generator or loading behavior; and
- distinguish a product bug from a test-harness failure or expected behavior.

If a report cannot proceed, close it through an explicit outcome:

- **duplicate**: link the canonical issue;
- **invalid**: explain why the reported result is expected or outside the supported behavior;
- **cannot reproduce**: record the versions, environment, and steps checked, plus the missing evidence needed to reopen; or
- **wontfix**: record the product or engineering reason.

## Severity

Severity measures user impact, not implementation effort or scheduling priority:

- **S1 — Critical:** a security or privacy failure, destructive behavior, or broadly unusable release requiring immediate containment or rollback consideration.
- **S2 — High:** core filtering, opening, restoration, or loading behavior is broken for many supported users and has no reasonable workaround.
- **S3 — Medium:** supported behavior is incorrect or substantially degraded, but impact is limited or a practical workaround exists.
- **S4 — Low:** minor visual, usability, documentation, or tooling behavior with little effect on successful use.

Maintainers assign or revise severity after reproduction. A narrowly reproducible bug can still be severe, and a frequently reported inconvenience can remain low severity.

## Lifecycle and required evidence

1. **Reported:** the issue contains the environment and safe reproduction information requested by the form.
2. **Triaged:** a maintainer records the reproduction result, severity, affected versions, and disposition or next action.
3. **Confirmed:** preserve a failing regression test before the fix when practical. Link the test and note any limitation that prevents automated coverage.
4. **Fixed in code:** link the fixing commit or pull request and the passing regression coverage. This state does not mean the fix is released.
5. **Submitted or deployed:** for an extension runtime bug, record the submitted Web Store version and release evidence. For a playground or tooling bug, record the relevant deployment or merged commit.
6. **Published and verified:** verify the behavior in the live target and record the result. For extension runtime bugs, the Chrome Web Store version must be live—not merely uploaded or under review.
7. **Closed:** close a release bug only after live verification, or close earlier with one of the explicit non-fix outcomes above.

When applicable, keep the issue connected to the regression test, fix commit, user-visible [changelog](../CHANGELOG.md) entry, Web Store submission/publication record, and final verification. See the [test guide](../tests/README.md) and [Chrome Web Store release workflow](chrome-web-store-release.md) for the corresponding commands and release states.

## Regression verification

Run the relevant focused regression while developing, then run both complete suites before pushing executable, configuration, workflow, manifest, package, fixture, or test changes:

```bash
npm run test:unit
npm run test:e2e
```

Record test failures and passes accurately. A passing extension assertion is not enough when the reported behavior also depends on an unverified playground assumption.
