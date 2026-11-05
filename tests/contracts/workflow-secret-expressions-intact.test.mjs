import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// autonomous-worker-test.yml once had every ${{ secrets.X }} replaced by masked log
// text ("*** secrets.X }}"), which made GitHub reject the whole file on every push.
const dir='.github/workflows'
const workflows=fs.readdirSync(dir).filter(name=>/\.ya?ml$/.test(name))

test('no workflow contains masked log text instead of an expression',()=>{
  for(const name of workflows){
    const lines=fs.readFileSync(path.join(dir,name),'utf8').split('\n')
    lines.forEach((line,index)=>{
      if(/^\s*#/.test(line))return
      assert.doesNotMatch(line,/\*\*\*\s*(secrets|vars|github|inputs|steps|env)\./,`${name}:${index+1} masked expression`)
      assert.doesNotMatch(line,/:\s*\*\*\*\s*$/,`${name}:${index+1} masked value`)
    })
  }
})

test('autonomous worker stays manual-only and its TEST DDL step requires explicit opt-in',()=>{
  const source=fs.readFileSync(path.join(dir,'autonomous-worker-test.yml'),'utf8')
  const triggers=source.slice(source.indexOf('\non:\n'),source.indexOf('\nconcurrency:'))
  const active=triggers.split('\n').filter(line=>!/^\s*#/.test(line)).join('\n')
  assert.match(active,/\n  workflow_dispatch:\n/)
  assert.doesNotMatch(active,/\n  (schedule|workflow_run|push|pull_request):/,'automatic triggers need an explicit Empresa Autónoma gate decision')
  assert.match(active,/allow_test_ddl_cleanup:\n[\s\S]*?default: false\n\s+type: boolean/)
  assert.match(source,/- name: Grant service_role UPDATE privileges and cleanup\n(?:\s+#.*\n)*\s+if: \$\{\{ inputs\.allow_test_ddl_cleanup == true \}\}/)
  assert.match(source,/UGO_TEST_SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY \}\}/)
})
