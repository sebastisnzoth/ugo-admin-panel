import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const panel=fs.readFileSync('src/mvp/AdminProviderVerificationPanel.tsx','utf8')

test('provider verification loads and groups canonical documents',()=>{
 assert.match(panel,/from\('documentos'\)/)
 assert.match(panel,/usuario_id,tipo,estado,url_storage/)
 assert.match(panel,/DOCUMENTOS ENVIADOS/)
 assert.match(panel,/docsByUser/)
 assert.match(panel,/identidad_frente/)
 assert.match(panel,/identidad_dorso/)
 assert.match(panel,/selfie/)
 assert.match(panel,/comprobante_domicilio/)
})

test('provider verification opens private files and reviews each document',()=>{
 assert.match(panel,/storage\.from\(bucket\)\.createSignedUrl/)
 assert.match(panel,/\['provider-kyc','documentos'\]/)
 assert.match(panel,/documentState\(d,'aprobado'\)/)
 assert.match(panel,/documentState\(d,'rechazado'\)/)
 assert.match(panel,/revisor_id/)
 assert.match(panel,/revisado_at/)
})

test('provider-level verification remains on authenticated operations bridge',()=>{
 assert.match(panel,/\/api\/operations\?op=provider-verification/)
 assert.match(panel,/Authorization:`Bearer \$\{token\}`/)
 assert.match(panel,/providerState\(r,'verificado'\)/)
 assert.match(panel,/providerState\(r,'suspendido'\)/)
})
