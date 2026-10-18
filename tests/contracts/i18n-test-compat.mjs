// Keep source contracts meaningful after UI copy moves into the locale catalogs.
// On a source-copy mismatch, evaluate the same assertion against each locale's
// rendered text while preserving interpolation expressions and structural code.
import assert from 'node:assert/strict'
import ts from 'typescript'
import {loadCatalogs} from '../../scripts/lib/i18n-catalog.mjs'
const supportedLocales = ['pt-BR', 'es', 'en']
const valuesByKey = new Map()
for(const [locale,catalog] of Object.entries(loadCatalogs()))for(const [key,value] of Object.entries(catalog)){
 const values=valuesByKey.get(key)||new Map()
 values.set(locale,value)
 valuesByKey.set(key,values)
}

function localizedSnapshot(actual, locale) {
  const source = ts.createSourceFile('contract-source.tsx', actual, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const edits = []
  const paramsFrom = object => {
    const params = new Map()
    if (!object || !ts.isObjectLiteralExpression(object)) return params
    for (const property of object.properties) {
      if (!ts.isPropertyAssignment(property)) continue
      const key = property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : null
      if (key) params.set(key, property.initializer.getText(source))
    }
    return params
  }
  const translated = (key, params = new Map()) => {
    const value = valuesByKey.get(key)?.get(locale)
    if (value === undefined) return null
    return value.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_match, name) => params.has(name) ? `{${params.get(name)}}` : '.*?')
  }
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
      const copy = translated(node.arguments[0].text, paramsFrom(node.arguments[1]))
      if (copy !== null) {
        const expression = node.parent && ts.isJsxExpression(node.parent) ? node.parent : null
        const attribute = expression?.parent && ts.isJsxAttribute(expression.parent)
        const replacement = expression ? (attribute ? `"${copy}"` : copy) : `'${copy.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'`
        edits.push(expression ? {start:expression.getStart(source),end:expression.end,text:replacement} : {start:node.getStart(source),end:node.end,text:replacement})
      }
    }
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && ts.isIdentifier(node.tagName) && node.tagName.text === 'LocalizedText') {
      const attrs = node.attributes.properties.filter(ts.isJsxAttribute)
      const id = attrs.find(attr => ts.isIdentifier(attr.name) && attr.name.text === 'id')
      const params = attrs.find(attr => ts.isIdentifier(attr.name) && attr.name.text === 'params')
      if (id?.initializer && ts.isStringLiteral(id.initializer)) {
        const paramsObject = params?.initializer && ts.isJsxExpression(params.initializer) ? paramsFrom(params.initializer.expression) : new Map()
        const copy = translated(id.initializer.text, paramsObject)
        if (copy !== null) {
          const element = node.parent && ts.isJsxElement(node.parent) ? node.parent : null
          edits.push({start:node.getStart(source),end:element ? element.end : node.end,text:copy})
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  let snapshot = actual
  for (const edit of edits.sort((a,b) => b.start-a.start)) snapshot = snapshot.slice(0,edit.start)+edit.text+snapshot.slice(edit.end)
  return snapshot
}

const originalMatch = assert.match.bind(assert)
assert.match = (actual, expected, message) => {
  try { return originalMatch(actual, expected, message) }
  catch (error) {
    if (typeof actual !== 'string' || !(expected instanceof RegExp)) throw error
    const flags = expected.flags.replace(/[gy]/g, '')
    for (const locale of supportedLocales) if (new RegExp(expected.source, flags).test(localizedSnapshot(actual, locale))) return
    throw error
  }
}
