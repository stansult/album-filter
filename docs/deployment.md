# Test-Gated Playground Deployment

The workflow in `.github/workflows/playwright.yml` runs the complete unit/tooling
and Chromium Playwright suites on pushes and pull requests to `main`.
Tests run even when deployment is unnecessary. Pull requests never deploy.

After tests pass on `main`, the deployment job checks `test/` and `netlify.toml`
against the last successful deployment recorded in the GitHub environment
`netlify-playground-production`. Unrelated changes skip publishing. Comparing
against a successful deployment, rather than the previous push, preserves
pending playground changes after failed tests or failed deployments.

The first run deploys once to establish its baseline. Missing Git history also
causes a deployment rather than risking skipped changes. API failures fail the job.
Deployment jobs are serialized and check that their commit is still main's tip
before publishing. An already-started upload is allowed to finish; the next
eligible run can publish the newer tested commit afterward.

Netlify CLI publishes only `test/` with `--prod --no-build`. This does not package
or publish the Chrome extension. A successful upload is followed by a GitHub
deployment record; if recording fails, a later run may safely redeploy.

## One-Time Setup

1. Add GitHub repository Actions secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.
2. Before pushing this workflow, stop Netlify's independent builds: **Project configuration > Build & deploy > Continuous deployment > Build settings > Configure**, then set **Build status** to **Stopped builds**. Do not stop auto publishing instead. The current live site stays available, and CLI deployments remain supported.
3. Push the workflow to `main`. Check that the test job passes and the deploy job publishes successfully. Missing secrets produce an explicit failure without changing the live site.

Until step 2 is done, Netlify's independent Git builds can bypass these tests.
The ignore rule in `netlify.toml` remains for legacy Git builds; Actions uses
`scripts/deployment-plan.cjs` instead. No Netlify account settings are changed by this workflow.

Official instructions: [GitHub secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets),
[Netlify stopped builds](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/),
[Netlify CLI deploy](https://cli.netlify.com/commands/deploy/).

## Verification and Recovery

- Read the workflow summary for why deployment ran or was skipped. Download the Playwright report artifact for test failures.
- A README-only change should pass tests and skip deployment after the first baseline exists.
- A playground change should publish only after tests pass. Fixing failed tests in a later commit must still publish any pending playground changes.
- Retry a failed workflow or use its **Run workflow** action on `main` after fixing secrets or service availability. It still runs tests and checks for pending changes.
- Avoid manual Netlify uploads or rollbacks while relying on this baseline: they do not update the GitHub deployment record.
- Run the complete unit/tooling suite locally with `npm run test:unit`.
