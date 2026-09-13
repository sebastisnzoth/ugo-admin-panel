import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('password recovery accepts Supabase PKCE and implicit links and updates password safely', async () => {
  const app = await read('src/mvp/MvpApp.tsx')

  assert.match(app, /exchangeCodeForSession\(code\)/)
  assert.match(app, /hash\.get\('type'\)==='recovery'/)
  assert.match(app, /hash\.get\('access_token'\)/)
  assert.match(app, /event==='PASSWORD_RECOVERY'/)
  assert.match(app, /updateUser\(\{password\}\)/)
  assert.match(app, /password!==confirmPassword/)
  assert.match(app, /autoComplete="new-password"/)
  assert.match(app, /await supabase\.auth\.signOut\(\)/)
  assert.match(app, /clean\.hash=''/)
})
