import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('landing role navigation stays on the currently deployed app path', async () => {
  const landing = await read('src/mvp/UgoLanding.tsx')
  assert.match(landing, /window\.location\.assign\(\`\$\{window\.location\.pathname\}\?app=\$\{role\}\`\)/)
  assert.doesNotMatch(landing, /\/ugo-cliente\//)
  assert.doesNotMatch(landing, /\/ugo-proveedor\//)
  assert.doesNotMatch(landing, /\/ugo-admin\//)
})

test('client and provider auth callbacks use the current deployment origin and pathname', async () => {
  const shared = await read('src/mvp/shared.tsx')
  assert.match(shared, /authRedirectTo=\`\$\{window\.location\.origin\}\$\{window\.location\.pathname\}\?app=\$\{appParam\}\`/)
  assert.doesNotMatch(shared, /vercel\.app/)
})

test('role profile validation never signs out a valid browser session while entering a flow',async()=>{const shared=await read('src/mvp/shared.tsx');const start=shared.indexOf('const loadProfile=useCallback');const end=shared.indexOf('useEffect(()=>{let active=true',start);const profileLoader=shared.slice(start,end);assert.doesNotMatch(profileLoader,/auth\.signOut\(/);assert.match(profileLoader,/Esta cuenta está desactivada/);assert.match(profileLoader,/Abrí la aplicación correspondiente/)})
