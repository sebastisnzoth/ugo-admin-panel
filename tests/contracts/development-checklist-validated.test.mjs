import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const dashboard=fs.readFileSync('src/mvp/DevelopmentDashboard.tsx','utf8')
const migration=fs.readFileSync('supabase/migrations/20260915113000_development_checklist_validated_status.sql','utf8')

test('checklist supports validated between implemented and approved',()=>{
 assert.match(migration,/implemented','validated','blocked'/)
 assert.match(dashboard,/type ChecklistStatus=.*'implemented'\|'validated'.*'approved'/)
 assert.match(dashboard,/validated:'Validado técnicamente'/)
 assert.match(dashboard,/\['validated','Validado'\]/)
})

test('validated does not inflate launch readiness',()=>{
 assert.match(dashboard,/approvedWeight=items\.filter\(item=>item\.status==='approved'\)/)
 assert.doesNotMatch(dashboard,/approvedWeight=items\.filter\(item=>item\.status==='validated'/)
 assert.match(dashboard,/Implementado y Validado se muestran separados hasta la prueba final/)
})
