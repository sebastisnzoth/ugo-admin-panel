import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const names = [
  'context-engineering',
  'debugging-and-error-recovery',
  'test-driven-development',
  'code-review-and-quality',
  'security-and-hardening',
  'ci-cd-and-automation',
  'shipping-and-launch',
  'browser-testing-with-devtools',
];

test('engineering skills have discoverable native metadata', () => {
  for (const name of names) {
    const file = join(root, '.agents', 'skills', name, 'SKILL.md');
    assert.ok(existsSync(file), 'missing ' + name);
    const content = readFileSync(file, 'utf8');
    assert.ok(content.startsWith('---\nname: ' + name + '\ndescription:'), 'invalid frontmatter for ' + name);
    assert.match(content, /\n# /, 'missing workflow body for ' + name);
  }
});

test('UGO has not lost its domain skill priorities', () => {
  for (const name of ['ugo-core', 'ugo-qa', 'ugo-recovery', 'ugo-client', 'ugo-provider']) {
    assert.ok(existsSync(join(root, '.agents', 'skills', name, 'SKILL.md')));
  }
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /## Agent Skills externos integrados/);
  assert.match(agents, /skills `ugo-\*`/);
  assert.match(agents, /matching/);
  assert.match(agents, /Ninguna skill autoriza producción/);
});

test('vendored instructions preserve source provenance and MIT notice', () => {
  const doc = readFileSync(join(root, 'docs', 'UGO_AGENT_SKILLS_INTEGRACION.md'), 'utf8');
  const license = readFileSync(join(root, 'docs', 'third-party', 'agent-skills-LICENSE'), 'utf8');
  assert.match(doc, /aeac41d4d005999432bb7312f7ff06383a91d59d/);
  assert.match(doc, /sebastisnzoth\/agent-skills/);
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2025 Addy Osmani/);
});
