const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

function readWorkflow(filename) {
  return readFileSync(path.resolve(__dirname, '..', '.github', 'workflows', filename), 'utf8');
}

test('Web Store publication workflow is submission-scoped and self-disabling', () => {
  const workflow = readWorkflow('webstore-publication.yml');

  assert.match(workflow, /^  workflow_dispatch:\s*$/m);
  assert.match(workflow, /^  schedule:\s*\n    - cron: '23 \*\/6 \* \* \*'$/m);
  assert.match(workflow, /^permissions:\s*\n  actions: write\s*\n  contents: read$/m);
  assert.doesNotMatch(workflow, /^  issues:/m);
  assert.match(workflow, /run: node scripts\/webstore-publication-check\.cjs/);
  assert.match(workflow, /Submitted version: \$EXPECTED_VERSION/);
  assert.match(workflow, /Live update-service version: \$LIVE_VERSION/);
  assert.match(workflow, /Publication detected: \$PUBLISHED/);

  const disableStep = workflow.slice(workflow.indexOf('- name: Disable publication polling'));
  assert.match(disableStep, /if: steps\.publication\.outputs\.published == 'true'/);
  assert.match(disableStep, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(
    disableStep,
    /gh workflow disable webstore-publication\.yml --repo "\$GITHUB_REPOSITORY"/
  );
});
