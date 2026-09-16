# Album Filter browser tests

Run the complete Node unit/tooling and browser suites:

```bash
npm run test:unit
npm run test:e2e
```

Use `npm run test:e2e:headed` to watch the complete browser suite. For a focused regression run that records traces, including successful tests:

```bash
npx playwright test filtering.spec.ts loading.spec.ts loading-transitions.spec.ts dimming.spec.ts --project=chromium --trace on
npx playwright show-report
```

Add `--headed` to watch the browser, or `--debug` to step through a test.
Use `npx playwright test --project=chromium` for the entire suite.
Generated Playwright-site examples are not part of the committed Album Filter suite.

Playwright writes the local HTML report to `playwright-report/index.html`. Traces and other per-test artifacts are stored beneath `test-results/`; open a trace with `npx playwright show-trace <trace.zip>` or open the HTML report with `npx playwright show-report`.

CI runs both standard suites before eligible playground deployments. See [deployment setup](../docs/deployment.md). `npm run test:unit` discovers the deployment-decision, packaging, and release-bookkeeping tests in `scripts/*.test.cjs`; packaging tests use temporary fixtures without changing the real manifest or `dist/`, and bookkeeping tests mock Git operations.

## Coverage

- `extension.spec.ts`: worker startup, opening/focus, basic filtering.
- `playground.spec.ts`: extension-free contracts for playground availability, configured batches, stable DOM markers, seeded generation, manual and automatic loading, Stop, completion, dataset reset, and responsive columns.
- `filtering.spec.ts`: complete visible/hidden sets, case/whitespace, all-word and quoted-phrase searches, changing/clearing queries, zero results, and close/reopen via button, Escape, and toolbar action.
- `loading.spec.ts`: newly loaded matches/nonmatches, Rescan not starting auto-load, completion, Stop, and closing during an in-flight batch.
- `loading-transitions.spec.ts`: changing a query during a load, clearing during pending hide, restarting Auto-load after Stop, and regenerating the list while filtering.
- `dimming.spec.ts`: immediate pending-card dimming during real playground batch insertion with auto-load on/off, opaque confirmed matches, compact placement, and desktop/mobile layout restoration.

## Test boundaries

Extension behavior tests load the actual unpacked extension and invoke its toolbar action through CDP. `playground.spec.ts` deliberately uses Playwright's ordinary browser fixture, without loading Album Filter, so it can detect fixture failures independently. Each extension test receives a fresh temporary browser profile. The fixtures honor headed/headless and viewport settings.

## Playground dependency matrix

| Playground contract | Independent coverage | Extension scenarios that depend on it |
| --- | --- | --- |
| Configured total and initial batch size | Initial-batch contract | Loading, transitions, and dimming |
| Seeded deterministic album generation | Seed contract | Loading and dimming datasets |
| Album-card, title, and count markers | DOM-marker contract | Discovery and every filtering assertion |
| Manual `Load next batch` behavior | Manual-loading contract | New-batch filtering and pending-card dimming |
| Auto-load batch progression | Auto-load contract | Extension Auto-load completion and restart |
| Stop permits the in-flight batch but prevents later scheduling | Stop contract | Extension Stop and close-panel behavior |
| Explicit end marker | Manual and Auto-load completion contracts | Extension completion detection |
| Generate list replaces and resets the dataset | Dataset-reset contract | Filtering across regenerated lists |
| Configured desktop and responsive mobile columns | Column contracts | Compact-layout restoration |

Search tests use 20 explicitly named albums. Loading tests use the playground's seeded generator and real batch-loading functions. The scroll sentinel is hidden in these controlled tests so browser height or filtering-induced layout changes cannot trigger additional natural loads. This does not test natural infinite scrolling.

Stop tests pause/advance the playground clock to allow one already-started batch to finish and verify no later batch is scheduled. They do not assume Stop cancels work already in flight. The clock is not a substitute for testing Facebook's actual network loading or the extension's isolated-world timers.

The pending-hide cancellation test observes the real pending CSS state and clicks Clear inside a browser-side MutationObserver to act within the 160 ms hide window. It then watches for cards becoming hidden for 500 ms, beyond that deadline. This timing-focused test uses the real button handler, but not a physical pointer click; ordinary Clear button interaction is covered separately.

The playground in `test/` is the only Facebook substitute. Its cards use the structure recognized by the extension on Facebook, and the extension applies the same compact layout, immediate new-card dimming, and inline notices. There is no separate mock Facebook page or Facebook URL interception. No Facebook account, credentials, or personal snapshots are used.

These tests do not prove compatibility with live Facebook markup, virtualized lists, or scrolling. Playground-specific extension handling remains only for page support detection and simulated loading controls, the scroll guard, and the explicit end marker.

## Manual playground check

1. Reload the unpacked extension in Chrome, then reload the local playground.
2. Keep the default random seed, set 48 total albums and a batch size of 24, and generate the list.
3. Open Album Filter and search for `a`. The inline notice should remain above the grid, and matches should be fully opaque.
4. Click the playground's `Load next batch`. Arriving cards should initially be dim, then matches become opaque and nonmatches disappear without Rescan.
5. Clear the filter: all loaded cards and the configured unfiltered column layout should return.
6. Repeat using the extension's `Auto-load` instead of `Load next batch`.

The pending state is brief; increasing the load delay makes the wait longer, not the dimming interval. Use the test trace or a recording to inspect that interval.
