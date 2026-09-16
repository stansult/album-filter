const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const tagPrefix = 'webstore-v';
const submissionTagPrefix = 'webstore-submitted-v';
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
const listingFiles = ['docs/description.txt'];

function parseVersion(version) {
  if (!/^\d+(\.\d+){0,3}$/.test(version)) throw new Error(`Invalid Chrome version: ${version}`);
  if (version.split('.').some(part => part.length > 1 && part.startsWith('0'))) {
    throw new Error(`Invalid Chrome version: ${version}`);
  }
  const parts = version.split('.').map(Number);
  if (parts.some(part => part > 65535)) throw new Error(`Invalid Chrome version: ${version}`);
  return [...parts, 0, 0, 0].slice(0, 4);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 4; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function latestReleaseTag(git) {
  const tags = git.output(['tag', '--list', `${tagPrefix}*`]).split('\n').filter(Boolean);
  for (const tag of tags) parseVersion(tag.slice(tagPrefix.length));
  return tags.sort((left, right) => (
    compareVersions(right.slice(tagPrefix.length), left.slice(tagPrefix.length))
  ))[0] || null;
}

function diffChanged(git, tag, paths) {
  const status = git.status(['diff', '--quiet', tag, 'HEAD', '--', ...paths]);
  if (status === 0) return false;
  if (status === 1) return true;
  throw new Error(`Could not compare ${tag} with HEAD`);
}

function releaseStatus({ git, version }) {
  parseVersion(version);
  const tag = latestReleaseTag(git);
  if (!tag) return { version, tag: null };
  return {
    version,
    tag,
    tagVersion: tag.slice(tagPrefix.length),
    runtimeChanged: diffChanged(git, tag, runtimeFiles),
    listingChanged: diffChanged(git, tag, listingFiles),
  };
}

function requireCleanSyncedMain(git) {
  if (git.output(['status', '--porcelain'])) throw new Error('Working tree must be clean.');
  if (git.output(['branch', '--show-current']) !== 'main') throw new Error('Release must be recorded from main.');

  const head = git.output(['rev-parse', 'HEAD']);
  const remoteHead = git.output(['rev-parse', 'origin/main']);
  if (head !== remoteHead) throw new Error('HEAD must match origin/main.');
  return head;
}

function tagExists(git, tag) {
  const status = git.status(['show-ref', '--verify', '--quiet', `refs/tags/${tag}`]);
  if (status === 0) return true;
  if (status === 1) return false;
  throw new Error(`Could not check tag: ${tag}`);
}

function requireNewerThanLatestRelease(git, version) {
  const previous = latestReleaseTag(git);
  if (previous && compareVersions(version, previous.slice(tagPrefix.length)) <= 0) {
    throw new Error(`Version ${version} must be newer than ${previous.slice(tagPrefix.length)}.`);
  }
}

function recordSubmission({ git, version, archivePath, readFile = readFileSync }) {
  parseVersion(version);
  const head = requireCleanSyncedMain(git);
  requireNewerThanLatestRelease(git, version);

  const tag = `${submissionTagPrefix}${version}`;
  if (tagExists(git, tag)) throw new Error(`Tag already exists: ${tag}`);

  const releaseTag = `${tagPrefix}${version}`;
  if (tagExists(git, releaseTag)) throw new Error(`Release tag already exists: ${releaseTag}`);

  let archive;
  try {
    archive = readFile(archivePath);
  } catch {
    throw new Error(`Could not read package: ${archivePath}`);
  }
  const sha256 = createHash('sha256').update(archive).digest('hex');
  const message = [
    `Chrome Web Store submission ${version}`,
    '',
    `Commit: ${head}`,
    `ZIP: ${archivePath}`,
    `SHA-256: ${sha256}`,
  ].join('\n');

  git.run(['tag', '-a', tag, '-m', message, head]);
  git.run(['push', 'origin', `refs/tags/${tag}`]);
  return { version, tag, head, archivePath, sha256 };
}

function recordRelease({ git, version }) {
  parseVersion(version);
  requireCleanSyncedMain(git);

  const tag = `${tagPrefix}${version}`;
  if (tagExists(git, tag)) throw new Error(`Tag already exists: ${tag}`);

  requireNewerThanLatestRelease(git, version);

  const submissionTag = `${submissionTagPrefix}${version}`;
  if (!tagExists(git, submissionTag)) {
    throw new Error(`Submission tag not found: ${submissionTag}`);
  }
  const submittedHead = git.output(['rev-parse', `${submissionTag}^{commit}`]);

  const message = `Chrome Web Store ${version}\n\nSubmission: ${submissionTag}`;
  git.run(['tag', '-a', tag, '-m', message, submittedHead]);
  git.run(['push', 'origin', `refs/tags/${tag}`]);
  return { version, tag, submissionTag, head: submittedHead };
}

function createGit() {
  function execute(args) {
    const result = spawnSync('git', args, { encoding: 'utf8' });
    if (result.error) throw result.error;
    return result;
  }
  return {
    output(args) {
      const result = execute(args);
      if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args[0]} failed`);
      return result.stdout.trim();
    },
    status(args) {
      return execute(args).status;
    },
    run(args) {
      const result = execute(args);
      if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args[0]} failed`);
    },
  };
}

function manifestVersion() {
  return JSON.parse(readFileSync('manifest.json', 'utf8')).version;
}

if (require.main === module) {
  try {
    const command = process.argv[2];
    const git = createGit();
    const version = command === 'record' && process.argv[3] ? process.argv[3] : manifestVersion();
    if (command === 'status') {
      if (process.argv[3]) throw new Error('Usage: release-bookkeeping.cjs status');
      const result = releaseStatus({ git, version });
      if (!result.tag) {
        console.log(`No Chrome Web Store release tag recorded. Current manifest: ${version}.`);
      } else {
        console.log(`Recorded release: ${result.tag}`);
        console.log(`Current manifest: ${version}`);
        console.log(`Runtime files: ${result.runtimeChanged ? 'changed' : 'unchanged'}`);
        console.log(`Store description: ${result.listingChanged ? 'changed' : 'unchanged'}`);
      }
    } else if (command === 'submit') {
      if (process.argv[3]) throw new Error('Usage: release-bookkeeping.cjs submit');
      const archivePath = `dist/album-filter-${version}.zip`;
      const result = recordSubmission({ git, version, archivePath });
      console.log(`Recorded ${result.tag} at ${result.head} and pushed it to origin.`);
      console.log(`ZIP SHA-256: ${result.sha256}`);
    } else if (command === 'record') {
      if (process.argv[4]) throw new Error('Usage: release-bookkeeping.cjs record [version]');
      const result = recordRelease({ git, version });
      console.log(`Recorded ${result.tag} at ${result.head} and pushed it to origin.`);
    } else {
      throw new Error('Usage: release-bookkeeping.cjs <status|submit|record>');
    }
  } catch (error) {
    console.error(`Release bookkeeping failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  compareVersions,
  latestReleaseTag,
  recordRelease,
  recordSubmission,
  releaseStatus,
};
