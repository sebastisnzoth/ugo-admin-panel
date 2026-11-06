import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const component=readFileSync('src/mvp/provider/ProviderCategoriesEditor.tsx','utf8')
const css=readFileSync('src/mvp/provider/provider-reference-dashboard.css','utf8')
test('category choices retain native controls and primary selection rules',()=>{
 assert.match(component,/<fieldset className="provider-category-options">/)
 assert.match(component,/<legend>\{t\('providerCategories.other'\)\}<\/legend>/)
 assert.match(component,/type="checkbox" checked=\{checked\} disabled=\{isPrimary\|\|busy\}/)
 assert.match(component,/saveProviderCategories\(primary,selected\)/)
 assert.match(component,/selectedFaxina&&<ProviderFaxinaSuppliesSettings/)
 assert.match(css,/provider-category-option:focus-within/)
 assert.match(css,/@media\(max-width:340px\)/)
})
