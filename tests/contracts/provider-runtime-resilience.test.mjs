import test from'node:test'
import assert from'node:assert/strict'
import{readFile}from'node:fs/promises'

const src=await readFile(new URL('../../src/mvp/provider/providerData.tsx',import.meta.url),'utf8')

test('provider verification gate survives degraded operational snapshot loads',()=>{
 assert.match(src,/from\('perfiles_proveedor'\)\.select\('\*'\).*gateProfile/)
 assert.match(src,/setProvider\(\(gateProfile as ProviderProfileFull\|null\)\|\|null\)/)
 assert.match(src,/loadProviderSnapshot\(supabase,session\.user\.id\)/)
 assert.match(src,/setProvider\(snap\.provider\|\|\(\(gateProfile as ProviderProfileFull\|null\)\|\|null\)\)/)
})
