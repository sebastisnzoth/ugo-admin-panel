import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const catalogPaths = ['src/i18n/translations/coreBase.ts', 'src/i18n/translations/recovery.ts', 'src/i18n/translations/opportunities.ts', 'src/i18n/translations/payout.ts', 'src/i18n/translations/earnings.ts']
const localePath = 'src/i18n/locale.tsx'
const supported = ['pt-BR', 'es', 'en']
const catalogs = catalogPaths.map(file => ({file, text: fs.readFileSync(file, 'utf8')}))
const localeText = fs.readFileSync(localePath, 'utf8')
const sources = catalogs.map(({file,text}) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS))

function localeCatalogs() {
  const result = new Map()
  function visit(node) {
    if (ts.isPropertyAssignment(node) && supported.includes(node.name?.text) && ts.isObjectLiteralExpression(node.initializer)) {
      const keys = result.get(node.name.text) ?? new Set()
      for (const property of node.initializer.properties) {
        if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name)) keys.add(property.name.text)
      }
      result.set(node.name.text, keys)
    }
    ts.forEachChild(node, visit)
  }
  for (const source of sources) {
    assert.equal(source.parseDiagnostics.length, 0, `${source.fileName} must be valid TypeScript`)
    visit(source)
  }
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
    'src/mvp/ProviderLocationTracker.tsx',
    'src/mvp/ProviderPayoutPanel.tsx',
    'src/mvp/provider/ProviderEarnings.tsx',
    'src/mvp/provider/ProviderHome.tsx',
    'src/mvp/ProviderOnboardingGate.tsx',
    'src/mvp/AdminGate.tsx',
    'src/mvp/AdminPhase2.tsx',
    'src/mvp/UgoLanding.tsx',
    'src/features/client/request/ClientPostConfirmFlow.tsx',
    'src/features/client/order/ClientServiceDetail.tsx',
    'src/features/client/order/ClientEvidenceGallery.tsx',
    'src/features/client/payments/ClientPaymentChoice.tsx',
    'src/features/client/profile/ClientProfilePanel.tsx',
    'src/mvp/provider/ProviderAgenda.tsx',
    'src/mvp/provider/ProviderActiveJob.tsx',
    'src/mvp/provider/ProviderEvidencePanel.tsx',
    'src/mvp/provider/ProviderOpportunities.tsx',
    'src/features/client/rating/ClientRatingPrompt.tsx'
    ,'src/features/client/request/ClientRequestEvidence.tsx'
    ,'src/features/client/request/ClientLocationScreen.tsx'
    ,'src/features/client/order/ClientActiveMap.tsx'
  ]
  const catalogs = localeCatalogs()
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const [, key] of text.matchAll(/t\(['"]((?:clientHome|clientOnboarding|providerHome|providerOnboarding|adminAuth|adminShell|landing|clientMatch|clientOrder|clientEvidence|clientLocation|clientMap|clientRating|clientPayment|clientProfile|providerAgenda|providerJob|providerEvidence|clientNeed|clientMenu|clientHeader|clientRoot|providerRoot|clientReview|clientTracking|clientAssigned|clientBoundary|clientHistory|clientSummary|clientPayment|clientDetail|clientProfile|providerGps|providerOpportunity|providerPayout|providerEarnings)\.[^'"]+)['"](?!\s*\+)/g)) {
      for (const locale of supported) assert.ok(catalogs.get(locale).has(key), `${file} uses missing ${locale} key ${key}`)
    }
  }
})

test('selected language is exposed to browsers and assistive technology', () => {
  assert.match(localeText, /document\.documentElement\.lang=locale/)
})
