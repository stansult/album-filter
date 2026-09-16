const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const {
  compareVersions,
  recordRelease,
  recordSubmission,
  releaseStatus,
} = require('./release-bookkeeping.cjs');

function fakeGit({
  dirty = false,
  branch = 'main',
  head = 'abc',
  remoteHead = 'abc',
  submittedHead = 'submitted',
  tags = '',
  existingTags = [],
  diffs = {},
} = {}) {
  const runs = [];
  const outputs = [];
  return {
    runs,
    outputs,
    output(args) {
      outputs.push(args);
      if (args[0] === 'status') return dirty ? ' M content.js' : '';
      if (args[0] === 'branch') return branch;
      if (args[0] === 'rev-parse') {
        if (args[1] === 'HEAD') return head;
        if (args[1] === 'origin/main') return remoteHead;
        if (args[1].endsWith('^{commit}')) return submittedHead;
      }
      if (args[0] === 'tag') return tags;
      throw new Error(`Unexpected output call: ${args.join(' ')}`);
    },
    status(args) {
      if (args[0] === 'show-ref') {
        const tag = args.at(-1).replace('refs/tags/', '');
        return existingTags.includes(tag) ? 0 : 1;
      }
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
  assert.deepEqual(git.outputs[0], ['tag', '--list', 'webstore-v*']);
});

test('submission records the exact commit and ZIP SHA-256 in an annotated tag', () => {
  const git = fakeGit({ tags: 'webstore-v0.1.4' });
  const archive = Buffer.from('uploaded zip bytes');
  const sha256 = createHash('sha256').update(archive).digest('hex');
  assert.deepEqual(recordSubmission({
    git,
    version: '0.1.5',
    archivePath: 'dist/album-filter-0.1.5.zip',
    readFile: () => archive,
  }), {
    version: '0.1.5',
    tag: 'webstore-submitted-v0.1.5',
    head: 'abc',
    archivePath: 'dist/album-filter-0.1.5.zip',
    sha256,
  });
  assert.deepEqual(git.runs, [
    [
      'tag', '-a', 'webstore-submitted-v0.1.5', '-m',
      `Chrome Web Store submission 0.1.5\n\nCommit: abc\nZIP: dist/album-filter-0.1.5.zip\nSHA-256: ${sha256}`,
      'abc',
    ],
    ['push', 'origin', 'refs/tags/webstore-submitted-v0.1.5'],
  ]);
});

test('publication tags the submitted commit even after main advances', () => {
  const git = fakeGit({
    head: 'new-main',
    remoteHead: 'new-main',
    submittedHead: 'uploaded-commit',
    tags: 'webstore-v0.1.4',
    existingTags: ['webstore-submitted-v0.1.5'],
  });
  assert.deepEqual(recordRelease({ git, version: '0.1.5' }), {
    version: '0.1.5',
    tag: 'webstore-v0.1.5',
    submissionTag: 'webstore-submitted-v0.1.5',
    head: 'uploaded-commit',
  });
  assert.deepEqual(git.runs, [
    [
      'tag', '-a', 'webstore-v0.1.5', '-m',
      'Chrome Web Store 0.1.5\n\nSubmission: webstore-submitted-v0.1.5',
      'uploaded-commit',
    ],
    ['push', 'origin', 'refs/tags/webstore-v0.1.5'],
  ]);
});

test('publication requires a submission tag', () => {
  assert.throws(
    () => recordRelease({ git: fakeGit({ tags: 'webstore-v0.1.4' }), version: '0.1.5' }),
    /Submission tag not found/,
  );
});

test('submission rejects an unreadable package', () => {
  assert.throws(() => recordSubmission({
    git: fakeGit({ tags: 'webstore-v0.1.4' }),
    version: '0.1.5',
    archivePath: 'dist/album-filter-0.1.5.zip',
    readFile: () => { throw new Error('missing'); },
  }), /Could not read package/);
});

test('submission rejects an existing marker', () => {
  assert.throws(() => recordSubmission({
    git: fakeGit({
      tags: 'webstore-v0.1.4',
      existingTags: ['webstore-submitted-v0.1.5'],
    }),
    version: '0.1.5',
    archivePath: 'dist/album-filter-0.1.5.zip',
    readFile: () => Buffer.from('zip'),
  }), /Tag already exists/);
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

for (const [name, options, message] of [
  ['dirty tree', { dirty: true }, /clean/],
  ['non-main branch', { branch: 'feature' }, /from main/],
  ['out-of-sync main', { head: 'new', remoteHead: 'old' }, /match origin\/main/],
  ['non-incremented version', { tags: 'webstore-v0.1.5' }, /newer/],
]) {
  test(`submission rejects ${name}`, () => {
    assert.throws(() => recordSubmission({
      git: fakeGit(options),
      version: '0.1.5',
      archivePath: 'dist/album-filter-0.1.5.zip',
      readFile: () => Buffer.from('zip'),
    }), message);
  });
}
