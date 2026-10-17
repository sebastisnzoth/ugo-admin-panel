import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const locale=fs.readFileSync('src/i18n/locale.tsx','utf8')
const app=fs.readFileSync('src/mvp/MvpApp.tsx','utf8')

test('UGO locale preference supports Brazilian Portuguese, Spanish and English with pt-BR default',()=>{
 assert.match(locale,/type UgoLocale='pt-BR'\|'es'\|'en'/)
 assert.match(locale,/return'pt-BR'/)
 assert.match(locale,/language\.portuguese/)
 assert.match(locale,/language\.spanish/)
 assert.match(locale,/language\.english/)
})

test('UGO locale preference persists locally and in authenticated user metadata',()=>{
 assert.match(locale,/localStorage\.setItem\(key\|\|guestLocaleKey\(\),next\)/)
 assert.match(locale,/accountLocaleKey\(role\|\|'unknown',session\.user\.id\)/)
 assert.match(locale,/preferred_language:next/)
 assert.match(locale,/user_metadata\?\.preferred_language/)
})

test('UGO language selector is mounted for every application route through the root app',()=>{
 assert.match(app,/LocaleProvider/)
 assert.match(app,/<LocaleProvider><AppErrorBoundary><EnvironmentBadge\/><MvpAppRoutes\s*\/><\/AppErrorBoundary><\/LocaleProvider>/)
})
