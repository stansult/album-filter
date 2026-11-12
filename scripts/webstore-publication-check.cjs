const https = require('node:https');
const { appendFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { compareVersions } = require('./release-bookkeeping.cjs');

const extensionId = 'hflbafejehpoclienjonceojnnlckahm';
const updateUrl = 'https://clients2.google.com/service/update2/crx';

function validatedTagVersion(tag, pattern) {
  const version = tag.match(pattern)?.[1] || null;
  if (version) compareVersions(version, version);
  return version;
}

function submittedVersion(tag) {
  return validatedTagVersion(tag, /^webstore-submitted-v(\d+(?:\.\d+){0,3})$/);
}

function releasedVersion(tag) {
  return validatedTagVersion(tag, /^webstore-v(\d+(?:\.\d+){0,3})$/);
}

function pendingSubmissionVersion(tags) {
  const submitted = new Set(tags.map(submittedVersion).filter(Boolean));
  const released = new Set(tags.map(releasedVersion).filter(Boolean));
  return [...submitted]
    .filter(version => !released.has(version))
    .sort((left, right) => compareVersions(right, left))[0] || null;
}

function parseUpdateResponse(xml) {
  const update = xml.match(/<updatecheck\b[^>]*>/)?.[0];
  const status = update?.match(/\bstatus="([^"]+)"/)?.[1];
  const version = status === 'ok' ? update.match(/\bversion="([^"]+)"/)?.[1] : null;
  if (!version) throw new Error('Google update response did not contain a live package version.');
  compareVersions(version, version);
  return version;
}

function isPublished({ expectedVersion, liveVersion }) {
  return compareVersions(liveVersion, expectedVersion) >= 0;
}

function fetchLiveVersion(get = https.get) {
  const query = new URLSearchParams({
    response: 'updatecheck',
    prodversion: '142.0',
    acceptformat: 'crx2,crx3',
    x: `id=${extensionId}&uc`,
  });
  const url = `${updateUrl}?${query}`;

  return new Promise((resolve, reject) => {
    const request = get(url, { headers: { 'user-agent': 'album-filter-release-check' } }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Google update endpoint returned HTTP ${response.statusCode}.`));
        return;
      }

      response.setEncoding('utf8');
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(parseUpdateResponse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
  });
}

function gitTags() {
  const result = spawnSync('git', ['tag', '--list', 'webstore*'], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Could not read release tags.');
  return result.stdout.trim().split('\n').filter(Boolean);
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function checkPublication({
  tags = gitTags(),
  get = https.get,
  writeOutput = setOutput,
  log = console.log,
} = {}) {
  const expectedVersion = pendingSubmissionVersion(tags);
  if (!expectedVersion) {
    log('No submitted Web Store version is awaiting a publication record.');
    writeOutput('pending', 'false');
    writeOutput('published', 'false');
    return { pending: false, published: false };
  }

  const liveVersion = await fetchLiveVersion(get);
  const published = isPublished({ expectedVersion, liveVersion });
  log(`Submitted version: ${expectedVersion}`);
  log(`Live update-service version: ${liveVersion}`);
  log(`Publication detected: ${published ? 'yes' : 'no'}`);
  writeOutput('pending', 'true');
  writeOutput('expected_version', expectedVersion);
  writeOutput('live_version', liveVersion);
  writeOutput('published', String(published));
  return { pending: true, expectedVersion, liveVersion, published };
}

if (require.main === module) {
  checkPublication().catch(error => {
    console.error(`Web Store publication check failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  checkPublication,
  fetchLiveVersion,
  isPublished,
  parseUpdateResponse,
  pendingSubmissionVersion,
  releasedVersion,
  submittedVersion,
};
