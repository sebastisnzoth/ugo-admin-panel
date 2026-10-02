import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')

const files={}
async function src(path){return files[path]??=(await read(path))}

test('01 chat delegates authentication',async()=>assert.match(await src('api/hugo/chat.ts'),/authorizeHugo\(req,body\)/))
test('02 chat delegates origin policy',async()=>assert.match(await src('api/hugo/chat.ts'),/isAllowedHugoRequestOrigin\(req\)/))
test('03 chat delegates prompt construction',async()=>assert.match(await src('api/hugo/chat.ts'),/buildHugoPrompt/))
test('04 chat delegates UI action parsing',async()=>assert.match(await src('api/hugo/chat.ts'),/parseHugoUiAction/))
test('05 chat no longer creates Supabase auth clients',async()=>assert.doesNotMatch(await src('api/hugo/chat.ts'),/createClient\(/))

test('06 missing bearer is explicitly rejected',async()=>assert.match(await src('server/hugo/auth.ts'),/AUTH_REQUIRED/))
test('07 invalid Supabase session is explicitly rejected',async()=>assert.match(await src('server/hugo/auth.ts'),/INVALID_SESSION/))
test('08 auth verifies user server side',async()=>assert.match(await src('server/hugo/auth.ts'),/auth\.getUser\(token\)/))
test('09 auth loads persisted role and active flag',async()=>assert.match(await src('server/hugo/auth.ts'),/select\('tipo,activo'\)/))
test('10 auth delegates authority decision',async()=>assert.match(await src('server/hugo/auth.ts'),/decideHugoAuthority/))

test('11 inactive profiles fail closed',async()=>assert.match(await src('server/hugo/authority.ts'),/INACTIVE_PROFILE/))
test('12 role mismatch fails closed',async()=>assert.match(await src('server/hugo/authority.ts'),/ROLE_MISMATCH/))
test('13 client maps only to cliente',async()=>assert.match(await src('server/hugo/authority.ts'),/requestedRole==='client'\?actual==='cliente'/))
test('14 provider maps only to proveedor',async()=>assert.match(await src('server/hugo/authority.ts'),/requestedRole==='provider'\?actual==='proveedor'/))
test('15 superadmin request requires superadmin persisted role',async()=>assert.match(await src('server/hugo/authority.ts'),/:actual==='superadmin'/))

test('16 bearer secrets are redacted',async()=>assert.ok((await src('server/hugo/security.ts')).includes('Bearer [REDACTED]')))
test('17 JWTs are redacted',async()=>assert.ok((await src('server/hugo/security.ts')).includes('[REDACTED_JWT]')))
test('18 API-style secrets are redacted',async()=>assert.ok((await src('server/hugo/security.ts')).includes('[REDACTED_SECRET]')))
test('19 large blobs are redacted',async()=>assert.ok((await src('server/hugo/security.ts')).includes('[REDACTED_BLOB]')))

test('20 browser origins use explicit allowlist',async()=>assert.match(await src('server/hugo/cors.ts'),/HUGO_BROWSER_ORIGINS\.has\(origin\)/))
test('21 unknown browser origin cannot pass same-origin helper',async()=>assert.match(await src('server/hugo/cors.ts'),/return!origin\|\|Boolean\(allowedHugoOrigin\(req\)\)/))

test('22 client and provider have no admin UI actions',async()=>{const p=await src('server/hugo/permissions.ts');assert.match(p,/client:\{[^}]*uiActions:none/);assert.match(p,/provider:\{[^}]*uiActions:none/)})
test('23 admin UI actions are explicitly allowlisted',async()=>assert.match(await src('server/hugo/permissions.ts'),/adminUi=new Set<HugoUiActionType>\(\['refresh','navigate','open_service','map_filter'\]\)/))
test('24 superadmin navigation is checked independently',async()=>assert.match(await src('server/hugo/permissions.ts'),/target==='superadmin'\)return role==='superadmin'/))
test('25 public JSON contract retains message action data and authority fields',async()=>{const chat=await src('api/hugo/chat.ts');assert.match(chat,/hugo_mensaje:/);assert.match(chat,/ui_action:action/);assert.match(chat,/datos:null/);assert.match(chat,/authority:\{role:authority\.requestedRole/)})


test('26 chat never logs raw error objects or request context',async()=>{const chat=await src('api/hugo/chat.ts');assert.doesNotMatch(chat,/console\.error\('Hugo chat failed',error\)/);assert.match(chat,/console\.error\('Hugo chat failed',\{status,error_code:/)})
