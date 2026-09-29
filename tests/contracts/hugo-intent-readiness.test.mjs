import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'
const catalog=await readFile(new URL('../../src/mvp/voiceCatalog.ts',import.meta.url),'utf8')
const legacy=await readFile(new URL('../../src/mvp/hugoIntent.ts',import.meta.url),'utf8')
const dock=await readFile(new URL('../../src/features/client/hugo/ClientVoiceHugoDock.tsx',import.meta.url),'utf8')
test('Hugo intent keeps painter and plumbing natural-language coverage in ES/PT',()=>{
 assert.match(catalog,/plomero\|plomeria\|fontanero\|encanador\|encanamento\|hidraulico\|hidraulica\|sanitarista/)
 assert.match(catalog,/pintor\|pintura\|pintar\|repintar\|pared\|paredes\|retoque\|tinta/)
 assert.match(legacy,/fontanero/)
 assert.match(legacy,/encanador/)
 assert.match(legacy,/repintar/)
})
test('client Hugo category tool remains wired to live active catalog resolver',()=>{
 assert.match(dock,/resolveVoiceCategory\(String\(args\.category\|\|''\)\)/)
 assert.match(catalog,/from\('categorias'\)/)
 assert.match(catalog,/eq\('activa',true\)/)
 assert.match(catalog,/resolveVoiceCategoryFromCatalog/)
})
