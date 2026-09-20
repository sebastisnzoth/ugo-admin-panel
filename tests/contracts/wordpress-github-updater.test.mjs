import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('WordPress GitHub updater verifies package integrity and supports rollback', async () => {
  const php = await source('wordpress/mu-plugins/ugo-github-updater.php')
  assert.match(php, /UGO_GH_TAG='wordpress-latest'/)
  assert.match(php, /current_user_can\('manage_options'\)/)
  assert.match(php, /check_admin_referer\('ugo_github_update'\)/)
  assert.match(php, /hash_file\('sha256'/)
  assert.match(php, /str_starts_with\(\$n,'\/'\)/)
  assert.match(php, /index\.html/)
  assert.match(php, /\/assets/)
  assert.match(php, /ugo_gh_rollback/)
  assert.match(php, /UGO_GITHUB_TOKEN/)
  assert.doesNotMatch(php, /update_option\([^\n]*GITHUB_TOKEN/i)
})

test('WordPress workflow publishes a pull package tied to the exact main SHA', async () => {
  const workflow = await source('.github/workflows/wordpress-deploy.yml')
  assert.match(workflow, /permissions:\s*\n\s*contents: write/)
  assert.match(workflow, /dist\/ugo-build-manifest\.json/)
  assert.match(workflow, /"commit": "\$\{GITHUB_SHA\}"/)
  assert.match(workflow, /ugo-wordpress-build\.zip\.sha256/)
  assert.match(workflow, /gh release (?:view|create) wordpress-latest/)
  assert.match(workflow, /gh release upload wordpress-latest/)
  assert.match(workflow, /local-dir: \.\/wordpress\/mu-plugins\//)
})
