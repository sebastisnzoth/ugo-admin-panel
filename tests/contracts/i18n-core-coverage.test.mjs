import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const catalogPath = 'src/i18n/translations/core.ts'
const localePath = 'src/i18n/locale.tsx'
const supported = ['pt-BR', 'es', 'en']
const catalogText = fs.readFileSync(catalogPath, 'utf8')
const localeText = fs.readFileSync(localePath, 'utf8')
const source = ts.createSourceFile(catalogPath, catalogText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

function localeCatalogs() {
  const result = new Map()
  function visit(node) {
    if (ts.isPropertyAssignment(node) && supported.includes(node.name?.text) && ts.isObjectLiteralExpression(node.initializer)) {
      const keys = new Set()
      for (const property of node.initializer.properties) {
        if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name)) keys.add(property.name.text)
      }
      result.set(node.name.text, keys)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return result
}

test('core translation catalog contains the same keys in every supported language', () => {
  const catalogs = localeCatalogs()
  assert.deepEqual([...catalogs.keys()].sort(), [...supported].sort())
  const baseline = [...catalogs.get('pt-BR')].sort()
  for (const locale of supported) assert.deepEqual([...catalogs.get(locale)].sort(), baseline, `${locale} catalog differs`)
})

test('active role entry screens only reference keys present in all core catalogs', () => {
  const files = [
    'src/features/client/home/ClientHomeScreen.tsx',
    'src/features/client/onboarding/ClientOnboardingGate.tsx',
    'src/mvp/provider/ProviderRoot.tsx',
    'src/mvp/provider/ProviderHome.tsx',
    'src/mvp/ProviderOnboardingGate.tsx',
    'src/mvp/AdminGate.tsx',
    'src/mvp/AdminPhase2.tsx',
    'src/mvp/UgoLanding.tsx'
  ]
  const catalogs = localeCatalogs()
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const [, key] of text.matchAll(/t\(['"]((?:clientHome|clientOnboarding|providerHome|providerOnboarding|adminAuth|adminShell|landing)\.[^'"]+)['"]/g)) {
      for (const locale of supported) assert.ok(catalogs.get(locale).has(key), `${file} uses missing ${locale} key ${key}`)
    }
  }
})

test('selected language is exposed to browsers and assistive technology', () => {
  assert.match(localeText, /document\.documentElement\.lang=locale/)
})
