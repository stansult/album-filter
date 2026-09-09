const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  compareVersions,
  recordRelease,
  releaseStatus,
} = require('./release-bookkeeping.cjs');

function fakeGit({ dirty = false, branch = 'main', head = 'abc', remoteHead = 'abc', tags = '', diffs = {} } = {}) {
  const runs = [];
  return {
    runs,
    output(args) {
      if (args[0] === 'status') return dirty ? ' M content.js' : '';
      if (args[0] === 'branch') return branch;
      if (args[0] === 'rev-parse') return args[1] === 'HEAD' ? head : remoteHead;
      if (args[0] === 'tag') return tags;
      throw new Error(`Unexpected output call: ${args.join(' ')}`);
    },
    status(args) {
      if (args[0] === 'show-ref') return 1;
      if (args[0] === 'diff') return diffs[args.at(-1)] || 0;
      throw new Error(`Unexpected status call: ${args.join(' ')}`);
    },
    run(args) {
      runs.push(args);
    },
  };
}

test('Chrome versions compare numerically', () => {
  assert.equal(compareVersions('0.1.5', '0.1.4') > 0, true);
  assert.equal(compareVersions('1.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.10', '1.9.9') > 0, true);
  assert.throws(() => compareVersions('1.2.beta', '1.2.0'), /Invalid Chrome version/);
  assert.throws(() => compareVersions('1.02', '1.2'), /Invalid Chrome version/);
});

test('status reports runtime and listing changes from the latest release tag', () => {
  const git = fakeGit({
    tags: 'webstore-v0.1.3\nwebstore-v0.1.4',
    diffs: { 'icon128.png': 1, 'docs/description.txt': 0 },
  });
  assert.deepEqual(releaseStatus({ git, version: '0.1.5' }), {
    version: '0.1.5',
    tag: 'webstore-v0.1.4',
    tagVersion: '0.1.4',
    runtimeChanged: true,
    listingChanged: false,
  });
});

test('record creates and pushes an annotated version tag', () => {
  const git = fakeGit({ tags: 'webstore-v0.1.4' });
  assert.deepEqual(recordRelease({ git, version: '0.1.5' }), {
    version: '0.1.5', tag: 'webstore-v0.1.5', head: 'abc',
  });
  assert.deepEqual(git.runs, [
    ['tag', '-a', 'webstore-v0.1.5', '-m', 'Chrome Web Store 0.1.5'],
    ['push', 'origin', 'refs/tags/webstore-v0.1.5'],
  ]);
});

for (const [name, options, message] of [
  ['dirty tree', { dirty: true }, /clean/],
  ['non-main branch', { branch: 'feature' }, /from main/],
  ['out-of-sync main', { head: 'new', remoteHead: 'old' }, /match origin\/main/],
  ['non-incremented version', { tags: 'webstore-v0.1.5' }, /newer/],
]) {
  test(`record rejects ${name}`, () => {
    assert.throws(() => recordRelease({ git: fakeGit(options), version: '0.1.5' }), message);
  });
}
