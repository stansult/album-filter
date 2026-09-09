# Album Filter browser tests

Run the new regression tests and record traces, including successful tests:

```bash
npx playwright test filtering.spec.ts loading.spec.ts dimming.spec.ts --project=chromium --trace on
npx playwright show-report
```

Add `--headed` to watch the browser, or `--debug` to step through a test.
Use `npx playwright test --project=chromium` for the entire suite.
Generated Playwright-site examples are not part of the committed Album Filter suite.

## Coverage

- `extension.spec.ts`: worker startup, opening/focus, basic filtering.
- `playground.spec.ts`: playground availability.
- `filtering.spec.ts`: complete visible/hidden sets, case/whitespace, all-word and quoted-phrase searches, changing/clearing queries, zero results, and close/reopen via button, Escape, and toolbar action.
- `loading.spec.ts`: newly loaded matches/nonmatches, Rescan not starting auto-load, completion, Stop, and closing during an in-flight batch.
- `dimming.spec.ts`: immediate pending-card dimming during real playground batch insertion with auto-load on/off, opaque confirmed matches, compact placement, and desktop/mobile layout restoration.

## Test boundaries

Tests load the actual unpacked extension and invoke its toolbar action through CDP.
Each test receives a fresh temporary browser profile. The fixture honors headed/headless and viewport settings.

Search tests use 20 explicitly named albums. Loading tests use the playground's seeded generator and real batch-loading functions. The scroll sentinel is hidden in these controlled tests so browser height or filtering-induced layout changes cannot trigger additional natural loads. This does not test natural infinite scrolling.

Stop tests pause/advance the playground clock to allow one already-started batch to finish and verify no later batch is scheduled. They do not assume Stop cancels work already in flight. The clock is not a substitute for testing Facebook's actual network loading or the extension's isolated-world timers.

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
