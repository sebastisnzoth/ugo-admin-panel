import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const catalogPaths = fs.readdirSync('src/i18n/translations').filter(file => file.endsWith('.ts')).map(file => `src/i18n/translations/${file}`).filter(file => !file.endsWith('/core.ts')).concat('src/i18n/locale.tsx')
const localePath = 'src/i18n/locale.tsx'
const supported = ['pt-BR', 'es', 'en']
const catalogs = catalogPaths.map(file => ({file, text: fs.readFileSync(file, 'utf8')}))
const localeText = fs.readFileSync(localePath, 'utf8')
const sources = catalogs.map(({file,text}) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS))

function localeCatalogs() {
  const result = new Map()
  function visit(node) {
    if (ts.isPropertyAssignment(node) && supported.includes(node.name?.text) && ts.isObjectLiteralExpression(node.initializer)) {
      const keys = result.get(node.name.text) ?? new Map()
      for (const property of node.initializer.properties) {
        if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name) && ts.isStringLiteral(property.initializer)) keys.set(property.name.text, property.initializer.text)
      }
      result.set(node.name.text, keys)
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(node.getSourceFile()) === 'Object' && node.expression.name.text === 'assign' && node.arguments.length >= 2) {
      const target = node.arguments[0]
      const value = node.arguments[1]
      const locale = ts.isElementAccessExpression(target) && ts.isStringLiteral(target.argumentExpression) ? target.argumentExpression.text : undefined
      if (locale && supported.includes(locale) && ts.isObjectLiteralExpression(value)) {
        const keys = result.get(locale) ?? new Map()
        for (const property of value.properties) {
          if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name) && ts.isStringLiteral(property.initializer)) keys.set(property.name.text, property.initializer.text)
        }
        result.set(locale, keys)
      }
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
  const baseline = [...catalogs.get('pt-BR').keys()].sort()
  for (const locale of supported) assert.deepEqual([...catalogs.get(locale).keys()].sort(), baseline, `${locale} catalog differs`)
  const parameters = value => [...value.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort()
  for (const key of baseline) {
    const expected = parameters(catalogs.get('pt-BR').get(key))
    for (const locale of supported.slice(1)) assert.deepEqual(parameters(catalogs.get(locale).get(key)), expected, `${key} interpolation differs in ${locale}`)
  }
})

test('active role entry screens only reference keys present in all core catalogs', () => {
  const files = []
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      const file = `${directory}/${entry.name}`
      if (entry.isDirectory()) visit(file)
      else if (file.endsWith('.tsx')) files.push(file)
    }
  }
  visit('src')
  const catalogs = localeCatalogs()
  const namespaces = new Set([...catalogs.get('pt-BR').keys()].map(key => key.split('.')[0]))
  const missing = []
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    const references = [
      ...text.matchAll(/t\(['"]([A-Za-z][A-Za-z0-9_-]*\.[^'"]+)['"](?!\s*\+)/g),
      ...text.matchAll(/LocalizedText\s+id=['"]([A-Za-z][A-Za-z0-9_-]*\.[^'"]+)['"]/g),
    ]
    for (const [, key] of references) {
      if (!namespaces.has(key.split('.')[0])) continue // Ignore Supabase select() strings that happen to contain dots.
      for (const locale of supported) if (!catalogs.get(locale).has(key)) missing.push(`${file} uses missing ${locale} key ${key}`)
    }
  }
  assert.deepEqual(missing, [], 'every UI translation reference must be present in every supported locale')
})

test('selected language is exposed to browsers and assistive technology', () => {
  assert.match(localeText, /document\.documentElement\.lang=locale/)
})
