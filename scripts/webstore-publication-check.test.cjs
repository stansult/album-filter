const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  checkPublication,
  fetchLiveVersion,
  isPublished,
  parseUpdateResponse,
  pendingSubmissionVersion,
  releasedVersion,
  submittedVersion,
} = require('./webstore-publication-check.cjs');

function updateXml(version = '0.1.6') {
  return '<?xml version="1.0"?><gupdate><app status="ok">'
    + `<updatecheck codebase="https://example.invalid/extension.crx" version="${version}" status="ok"/>`
    + '</app></gupdate>';
}

function fakeGet({ statusCode = 200, body = '', error = null, inspect = () => {} } = {}) {
  return (url, options, callback) => {
    inspect(url, options);
    const request = new EventEmitter();
    queueMicrotask(() => {
      if (error) {
        request.emit('error', error);
        return;
      }
      const response = new EventEmitter();
      response.statusCode = statusCode;
      response.setEncoding = () => {};
      response.resume = () => {};
      callback(response);
      queueMicrotask(() => {
        response.emit('data', body);
        response.emit('end');
      });
    });
    return request;
  };
}

test('submission and publication tags expose only Album Filter version formats', () => {
  assert.equal(submittedVersion('webstore-submitted-v0.1.6'), '0.1.6');
  assert.equal(submittedVersion('webstore-v0.1.6'), null);
  assert.equal(submittedVersion('webstore-submitted-v0.1.6-r2'), null);
  assert.equal(releasedVersion('webstore-v0.1.6'), '0.1.6');
  assert.equal(releasedVersion('webstore-submitted-v0.1.6'), null);
  assert.throws(() => submittedVersion('webstore-submitted-v0.01.6'), /Invalid Chrome version/);
});

test('pending version is the newest submitted version without a publication tag', () => {
  assert.equal(pendingSubmissionVersion([
    'webstore-submitted-v0.1.5',
    'webstore-v0.1.5',
    'webstore-submitted-v0.1.6',
    'webstore-submitted-v0.2.0',
    'unrelated-tag',
  ]), '0.2.0');
  assert.equal(pendingSubmissionVersion([
    'webstore-submitted-v0.1.6',
    'webstore-v0.1.6',
  ]), null);
});

test('Google update response exposes a valid live package version', () => {
  assert.equal(parseUpdateResponse(updateXml()), '0.1.6');
  assert.throws(
    () => parseUpdateResponse('<gupdate><updatecheck status="noupdate"/></gupdate>'),
    /did not contain a live package version/
  );
  assert.throws(() => parseUpdateResponse(updateXml('0.01.6')), /Invalid Chrome version/);
});

test('publication requires the live package to reach the submitted version', () => {
  assert.equal(isPublished({ expectedVersion: '0.1.6', liveVersion: '0.1.5' }), false);
  assert.equal(isPublished({ expectedVersion: '0.1.6', liveVersion: '0.1.6' }), true);
  assert.equal(isPublished({ expectedVersion: '0.1.6', liveVersion: '0.2.0' }), true);
});

test('live-version request uses Album Filter update-service parameters', async () => {
  let requestUrl;
  const version = await fetchLiveVersion(fakeGet({
    body: updateXml(),
    inspect(url, options) {
      requestUrl = new URL(url);
      assert.equal(options.headers['user-agent'], 'album-filter-release-check');
    },
  }));

  assert.equal(version, '0.1.6');
  assert.equal(requestUrl.origin + requestUrl.pathname, 'https://clients2.google.com/service/update2/crx');
  assert.equal(requestUrl.searchParams.get('response'), 'updatecheck');
  assert.equal(requestUrl.searchParams.get('acceptformat'), 'crx2,crx3');
  assert.equal(
    requestUrl.searchParams.get('x'),
    'id=hflbafejehpoclienjonceojnnlckahm&uc'
  );
});

test('live-version request rejects HTTP and network failures', async () => {
  await assert.rejects(
    fetchLiveVersion(fakeGet({ statusCode: 503 })),
    /Google update endpoint returned HTTP 503/
  );
  await assert.rejects(
    fetchLiveVersion(fakeGet({ error: new Error('offline') })),
    /offline/
  );
});

test('publication check reports no pending submission without querying Google', async () => {
  const outputs = [];
  const result = await checkPublication({
    tags: ['webstore-submitted-v0.1.5', 'webstore-v0.1.5'],
    get: () => { throw new Error('Google should not be queried'); },
    writeOutput: (name, value) => outputs.push([name, value]),
    log: () => {},
  });

  assert.deepEqual(result, { pending: false, published: false });
  assert.deepEqual(outputs, [['pending', 'false'], ['published', 'false']]);
});

test('publication check reports submitted and live versions', async () => {
  const outputs = [];
  const result = await checkPublication({
    tags: ['webstore-submitted-v0.1.6', 'webstore-v0.1.5'],
    get: fakeGet({ body: updateXml('0.1.6') }),
    writeOutput: (name, value) => outputs.push([name, value]),
    log: () => {},
  });

  assert.deepEqual(result, {
    pending: true,
    expectedVersion: '0.1.6',
    liveVersion: '0.1.6',
    published: true,
  });
  assert.deepEqual(outputs, [
    ['pending', 'true'],
    ['expected_version', '0.1.6'],
    ['live_version', '0.1.6'],
    ['published', 'true'],
  ]);
});
