import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read = path => readFile(new URL('../../'+path,import.meta.url),'utf8')

test('Client language selector tracks active locale and keeps changes synced',async()=>{
 const source=await read('src/features/client/profile/ClientProfilePanel.tsx')
 assert.match(source,/const\{locale,setLocale,t\}=useLocale\(\)/)
 assert.match(source,/value=\{locale\} onChange=\{event=>/)
 assert.match(source,/setLocale\(next\)/)
})

test('Optional request photo heading is localized for three languages',async()=>{
 const [screen,catalog]=await Promise.all([
  read('src/features/client/request/ClientNeedScreen.tsx'),
  read('src/i18n/translations/followup.ts')
 ])
 assert.match(screen,/t\('clientNeed\.photosTitle'\)/)
 for(const expected of ['Fotos do serviço','Fotos del servicio','Service photos'])
  assert.ok(catalog.includes(expected),expected)
})
