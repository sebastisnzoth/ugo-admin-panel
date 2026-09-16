import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const users=fs.readFileSync('src/mvp/AdminUsersPanel.tsx','utf8')
const finance=fs.readFileSync('src/mvp/AdminFinancePanel.tsx','utf8')
const payments=fs.readFileSync('src/mvp/AdminPaymentMethods.tsx','utf8')
const superadmin=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const disputes=fs.readFileSync('src/mvp/AdminDecisionCenter.tsx','utf8')

test('admin account lifecycle changes require explicit confirmation',()=>{
 assert.match(users,/window\.confirm\(`\$\{next\?'Reactivar':'Desactivar'\}/)
 assert.match(users,/window\.confirm\(`Crear cuenta \$\{form\.role\}/)
 assert.match(users,/admin_set_usuario_activo/)
 assert.match(users,/admin-create-user/)
})

test('real withdrawal state changes require confirmation and external reference for paid',()=>{
 assert.match(finance,/state==='pagado'&&!ref/)
 assert.match(finance,/window\.confirm\(`Retiro REAL de/)
 assert.match(finance,/admin_actualizar_retiro/)
 assert.match(finance,/p_transferencia_externa_id:ref\|\|null/)
})

test('payment method and feature flag changes require confirmation',()=>{
 assert.match(payments,/window\.confirm\(`Vas a \$\{value\?'activar':'desactivar'\}/)
 assert.match(payments,/update\(key,String\(value\)\)/)
 assert.match(superadmin,/window\.confirm\(`Vas a \$\{next\?'activar':'desactivar'\} la feature flag/)
 assert.match(superadmin,/admin_set_feature_flag/)
})

test('dispute resolution keeps explicit impact review and confirmation',()=>{
 assert.match(disputes,/window\.confirm\(`Vas a resolver el caso/)
 assert.match(disputes,/text\.trim\(\)\.length<8/)
 assert.match(disputes,/resolverDisputa\(selected\.id,text\.trim\(\),favor\)/)
})
