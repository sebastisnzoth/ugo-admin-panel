import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8')
test('client Studio nav cleanup is consolidated into production lock',async()=>{const[styles,lock]=await Promise.all([read('src/features/client/clientStyles.ts'),read('src/mvp/client/client-ai-studio-production-lock.css')]);assert.doesNotMatch(styles,/client-navbar-cleanup\.css/);assert.match(lock,/ugo-studio-nav-services/);assert.match(lock,/ugo-studio-nav-pro/);assert.match(lock,/@media\(max-width:760px\)/);assert.match(lock,/@media\(max-width:460px\)/);assert.match(lock,/ugo-studio-nav-pro\{display:none!important\}/)})
