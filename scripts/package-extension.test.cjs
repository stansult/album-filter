const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectPackage = require('../package.json');

const runtimeFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'icon16.png',
  'icon32.png',
  'icon48.png',
  'icon128.png',
];

function fixture(version = '0.1.4') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'album-filter-package-'));
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: 'album-filter-package-test',
    private: true,
    scripts: {
      package: projectPackage.scripts.package,
      'package:patch': projectPackage.scripts['package:patch'],
    },
  }));
  fs.writeFileSync(path.join(root, 'manifest.json'), `${JSON.stringify({
    manifest_version: 3,
    name: 'Album Filter',
    version,
  }, null, 2)}\n`);
  for (const file of runtimeFiles.slice(1)) {
    fs.writeFileSync(path.join(root, file), `fixture:${file}\n`);
  }
  fs.writeFileSync(path.join(root, 'README.md'), 'must not be packaged\n');
  fs.mkdirSync(path.join(root, 'tests'));
  fs.writeFileSync(path.join(root, 'tests', 'example.spec.ts'), 'must not be packaged\n');
  fs.writeFileSync(path.join(root, 'docs', 'description.txt'), 'Initial store description\n');
  return root;
}

function run(root, script) {
  execFileSync('npm', ['run', script, '--silent'], { cwd: root, stdio: 'pipe' });
}

function archiveEntries(archive) {
  return execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .sort();
}

function archivedFile(archive, file) {
  return execFileSync('unzip', ['-p', archive, file]);
}

test('package creates a root-level ZIP containing only runtime files', () => {
  const root = fixture();
  try {
    const originalManifest = fs.readFileSync(path.join(root, 'manifest.json'));
    run(root, 'package');

    const archive = path.join(root, 'dist', 'album-filter-0.1.4.zip');
    assert.equal(fs.existsSync(archive), true);
    assert.deepEqual(archiveEntries(archive), [...runtimeFiles].sort());
    assert.deepEqual(fs.readFileSync(path.join(root, 'manifest.json')), originalManifest);
    for (const file of runtimeFiles) {
      assert.deepEqual(archivedFile(archive, file), fs.readFileSync(path.join(root, file)));
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('package emits listing text only when the description changes', () => {
  const root = fixture();
  try {
    run(root, 'package');
    const pending = path.join(root, 'dist', 'description-to-upload.txt');
    const baseline = path.join(root, 'dist', '.description-last');
    assert.equal(fs.readFileSync(pending, 'utf8'), 'Initial store description\n');
    assert.equal(fs.readFileSync(baseline, 'utf8'), 'Initial store description\n');

    fs.rmSync(pending);
    run(root, 'package');
    assert.equal(fs.existsSync(pending), false);

    fs.writeFileSync(path.join(root, 'docs', 'description.txt'), 'Updated store description\n');
    run(root, 'package');
    assert.equal(fs.readFileSync(pending, 'utf8'), 'Updated store description\n');
    assert.equal(fs.readFileSync(baseline, 'utf8'), 'Updated store description\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('package:patch increments the manifest patch version and names the ZIP accordingly', () => {
  const root = fixture();
  try {
    run(root, 'package:patch');

    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    assert.equal(manifest.version, '0.1.5');
    assert.equal(fs.existsSync(path.join(root, 'dist', 'album-filter-0.1.5.zip')), true);
    assert.equal(
      JSON.parse(archivedFile(path.join(root, 'dist', 'album-filter-0.1.5.zip'), 'manifest.json')).version,
      '0.1.5',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
