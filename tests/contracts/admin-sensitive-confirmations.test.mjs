import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const users=fs.readFileSync('src/mvp/AdminUsersPanel.tsx','utf8')
const finance=fs.readFileSync('src/mvp/AdminFinancePanel.tsx','utf8')
const payments=fs.readFileSync('src/mvp/AdminPaymentMethods.tsx','utf8')
const superadmin=fs.readFileSync('src/mvp/SuperAdminCommandCenter.tsx','utf8')
const disputes=fs.readFileSync('src/mvp/AdminDecisionCenter.tsx','utf8')

test('admin account lifecycle changes require explicit confirmation',()=>{
 assert.match(users,/await confirm\(\{title:next\?'Reactivar cuenta':'Desactivar cuenta',message:`\$\{next\?'Reactivar':'Desactivar'\}/)
 assert.match(users,/await confirm\(\{title:'Crear cuenta',message:`Crear cuenta \$\{form\.role\}/)
 assert.match(users,/admin_set_usuario_activo/)
 assert.doesNotMatch(users,/window\.(confirm|prompt|alert)\(/)
 assert.match(users,/useDialog.*from'\.\/dialogs'/)
 assert.match(users,/\{dialog\}/)
 assert.match(users,/admin-create-user/)
})

test('real withdrawal state changes require confirmation and external reference for paid',()=>{
 assert.match(finance,/state==='pagado'&&!ref/)
 assert.match(finance,/await confirm\(\{title:'Retiro REAL',message:`Retiro REAL de/)
 assert.match(finance,/admin_actualizar_retiro/)
 assert.match(finance,/p_transferencia_externa_id:ref\|\|null/)
 assert.doesNotMatch(finance,/window\.(confirm|prompt|alert)\(/)
 assert.match(finance,/useDialog.*from'\.\/dialogs'/)
 assert.match(finance,/\{dialog\}/)
})

test('payment method and feature flag changes require confirmation',()=>{
 assert.match(payments,/await confirm\(\{title:'Medio de pago',message:`Vas a \$\{value\?'activar':'desactivar'\}/)
 assert.match(payments,/update\(key,String\(value\)\)/)
 assert.match(superadmin,/await confirm\(\{title:'Feature flag',message:`Vas a \$\{next\?'activar':'desactivar'\} la feature flag/)
 assert.match(superadmin,/admin_set_feature_flag/)
 assert.doesNotMatch(superadmin,/window\.(confirm|prompt|alert)\(/)
 assert.match(superadmin,/useDialog.*from'\.\/dialogs'/)
 assert.match(superadmin,/\{dialog\}/)
})

test('dispute resolution keeps explicit impact review and confirmation',()=>{
 assert.match(disputes,/await confirm\(\{title:'Resolver disputa',message:`Vas a resolver el caso/)
 assert.match(disputes,/text\.trim\(\)\.length<8/)
 assert.match(disputes,/resolverDisputa\(selected\.id,text\.trim\(\),favor\)/)
 assert.doesNotMatch(disputes,/window\.(confirm|prompt|alert)\(/)
 assert.match(disputes,/useDialog.*from'\.\/dialogs'/)
 assert.match(disputes,/\{dialog\}/)
})

test('admin sensitive panels never use native browser dialogs',()=>{
 for(const source of [users,finance,payments,superadmin,disputes]){
  assert.doesNotMatch(source,/window\.(confirm|prompt|alert)\(/)
  assert.doesNotMatch(source,/(?<![a-zA-Z0-9_.])(?<!await )(?<!void )(confirm|prompt|alert)\(/)
 }
})
