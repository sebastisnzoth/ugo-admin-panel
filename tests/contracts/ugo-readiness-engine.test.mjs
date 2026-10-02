import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateFunctionalReadiness } from '../../scripts/ugo-readiness-engine.mjs'

const fixture = () => ({
  version:'TEST',
  execution_policy:{max_parallel:2},
  groups:[{
    id:'client',
    title:'Client',
    items:[
      {id:'a',title:'A',status:'NEEDS_RUNTIME_PROOF',declared_status:'NEEDS_RUNTIME_PROOF',priority:'CRITICAL',depends_on:[],resources:['r1'],owner:'UGO'},
      {id:'b',title:'B',status:'NEEDS_RUNTIME_PROOF',priority:'HIGH',depends_on:['a'],resources:['r1'],owner:'UGO'},
      {id:'c',title:'C',status:'NEEDS_RUNTIME_PROOF',priority:'HIGH',depends_on:[],resources:['r2'],owner:'UGO'},
      {id:'human',title:'Human',status:'HUMAN_FINAL',priority:'FINAL',depends_on:['b','c'],resources:['human'],owner:'SERGIO + UGO'},
    ]
  }]
})

test('readiness scheduler enables independent controls and blocks dependencies', () => {
  const {readiness,summary}=evaluateFunctionalReadiness({functionalReadiness:fixture(),locks:[],maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  const items=readiness.groups[0].items
  assert.equal(items.find(x=>x.id==='a').gate_state,'AVAILABLE')
  assert.equal(items.find(x=>x.id==='c').gate_state,'AVAILABLE')
  assert.equal(items.find(x=>x.id==='b').gate_state,'BLOCKED_DEPENDENCY')
  assert.equal(items.find(x=>x.id==='human').gate_state,'HUMAN_DEFERRED')
  assert.equal(summary.available_now,2)
})

test('authoritative DONE lock verifies control and unlocks dependent work', () => {
  const locks=[{
    task_id:'readiness-a',readiness_id:'a',status:'DONE',started_at:'2026-09-29T18:00:00Z',
    validators_result:{Judge:'PASS',Sentinel:'PASS'},evidence_ids:['evidence:a']
  }]
  const {readiness}=evaluateFunctionalReadiness({functionalReadiness:fixture(),locks,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  const items=readiness.groups[0].items
  assert.equal(items.find(x=>x.id==='a').gate_state,'VERIFIED')
  assert.equal(items.find(x=>x.id==='b').gate_state,'BLOCKED_DEPENDENCY')
})

test('authoritative DONE lock also accepts persisted validation schema', () => {
  const locks=[{
    task_id:'readiness-a',readiness_id:'a',status:'DONE',started_at:'2026-09-29T18:00:00Z',
    validation:{runtime:'PASS',judge:'PASS',sentinel:'PASS',production_touched:false},evidence_ids:['evidence:a']
  }]
  const {readiness}=evaluateFunctionalReadiness({functionalReadiness:fixture(),locks,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  const items=readiness.groups[0].items
  assert.equal(items.find(x=>x.id==='a').gate_state,'VERIFIED')
  assert.equal(items.find(x=>x.id==='b').gate_state,'AVAILABLE')
})

test('active readiness lock consumes global slot and resource', () => {
  const locks=[{
    task_id:'readiness-a',readiness_id:'a',status:'IN_PROGRESS',started_at:'2026-09-29T19:30:00Z',
    lease_expires_at:'2026-09-29T21:00:00Z',resources:['r1']
  }]
  const {readiness,summary}=evaluateFunctionalReadiness({functionalReadiness:fixture(),locks,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  const items=readiness.groups[0].items
  assert.equal(items.find(x=>x.id==='a').gate_state,'IN_PROGRESS')
  assert.equal(items.find(x=>x.id==='c').gate_state,'AVAILABLE')
  assert.equal(summary.in_progress,1)
})

test('human final remains deferred until autonomous controls are VERIFIED', () => {
  const base=fixture()
  const locks=base.groups[0].items.filter(x=>x.id!=='human').map((x,i)=>({
    task_id:'readiness-'+x.id,readiness_id:x.id,status:'DONE',started_at:`2026-09-29T1${i}:00:00Z`,
    validators_result:{judge:'PASS',sentinel:'PASS'},evidence_ids:['evidence:'+x.id]
  }))
  const {readiness}=evaluateFunctionalReadiness({functionalReadiness:base,locks,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  assert.equal(readiness.groups[0].items.find(x=>x.id==='human').gate_state,'HUMAN_REQUIRED')
})


test('open PR with runtime blocker is visible as WAITING_RUNTIME', () => {
  const pullRequests=[{
    number:283,
    title:'fix(client): close navigation readiness gaps',
    head_ref:'fix/a-readiness-20260929',
    head_sha:'abc',
    readiness_id:'a',
    evidence_status:'NEEDS_RUNTIME_PROOF',
    runtime_status:'NOT_AVAILABLE',
    judge:'PENDING_RUNTIME_PROOF',
    sentinel:'PENDING_RUNTIME_PROOF',
    updated_at:'2026-09-29T19:50:00Z',
    html_url:'https://github.com/example/pr/283'
  }]
  const {readiness,summary}=evaluateFunctionalReadiness({functionalReadiness:fixture(),locks:[],pullRequests,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  const item=readiness.groups[0].items.find(x=>x.id==='a')
  assert.equal(item.gate_state,'WAITING_RUNTIME')
  assert.equal(item.pull_request.number,283)
  assert.equal(summary.waiting_runtime,1)
  assert.equal(readiness.groups[0].items.find(x=>x.id==='b').gate_state,'BLOCKED_DEPENDENCY')
})


test('global jobs outside the functional catalog reserve their resources', () => {
  const locks=[{task_id:'external-worker',status:'IN_PROGRESS',
    lease_expires_at:'2026-09-29T21:00:00Z',resources:['r1']}]
  const {readiness}=evaluateFunctionalReadiness({functionalReadiness:fixture(),locks,maxParallel:3,now:new Date('2026-09-29T20:00:00Z')})
  assert.equal(readiness.groups[0].items.find(x=>x.id==='a').gate_state,'WAITING_RESOURCE_CAPACITY')
  assert.equal(readiness.groups[0].items.find(x=>x.id==='c').gate_state,'AVAILABLE')
})

test('active locks reserve resources beyond their catalog entry', () => {
  const locks=[{task_id:'readiness-a',readiness_id:'a',status:'IN_PROGRESS',
    lease_expires_at:'2026-09-29T21:00:00Z',resources:['r1','r2']}]
  const {readiness}=evaluateFunctionalReadiness({functionalReadiness:fixture(),locks,maxParallel:3,now:new Date('2026-09-29T20:00:00Z')})
  assert.equal(readiness.groups[0].items.find(x=>x.id==='c').gate_state,'WAITING_RESOURCE_CAPACITY')
})

test('expired global resource leases release capacity', () => {
  const locks=[{task_id:'external-worker',status:'IN_PROGRESS',
    lease_expires_at:'2026-09-29T19:00:00Z',resources:['r1','r2']}]
  const {summary}=evaluateFunctionalReadiness({functionalReadiness:fixture(),locks,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  assert.deepEqual(summary.runnable_ids,['a','c'])
})


test('HUMAN_REQUIRED lock is authoritative, releases capacity, and is not rescheduled', () => {
  const base=fixture()
  const locks=[{
    task_id:'readiness-a',readiness_id:'a',status:'HUMAN_REQUIRED',
    started_at:'2026-09-29T19:00:00Z',lease_expires_at:null,resources:['r1'],
    evidence_ids:['automated-runtime:a'],human_final:{required:true,status:'PENDING'}
  }]
  const {readiness,summary}=evaluateFunctionalReadiness({functionalReadiness:base,locks,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  const items=readiness.groups[0].items
  assert.equal(items.find(x=>x.id==='a').gate_state,'HUMAN_REQUIRED')
  assert.equal(items.find(x=>x.id==='c').gate_state,'AVAILABLE')
  assert.equal(summary.human_required,1)
  assert.equal(summary.in_progress,0)
  assert.ok(!summary.runnable_ids.includes('a'))
})


test('HUMAN_REQUIRED dependencies block autonomous descendants until physical evidence is complete', () => {
  const base=fixture()
  const locks=[{
    task_id:'readiness-a',readiness_id:'a',status:'HUMAN_REQUIRED',
    started_at:'2026-09-29T19:00:00Z',lease_expires_at:null,resources:['r1'],
    evidence_ids:['automated-runtime:a'],human_final:{required:true,status:'PENDING'}
  }]
  const {readiness}=evaluateFunctionalReadiness({functionalReadiness:base,locks,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  const items=readiness.groups[0].items
  assert.equal(items.find(x=>x.id==='a').gate_state,'HUMAN_REQUIRED')
  assert.equal(items.find(x=>x.id==='b').gate_state,'BLOCKED_DEPENDENCY')
  assert.deepEqual(items.find(x=>x.id==='b').unresolved_dependencies,['a'])
  assert.notEqual(items.find(x=>x.id==='a').status,'VERIFIED')
})


test('DONE lock cannot bypass an unresolved human dependency', () => {
  const base=fixture()
  const locks=[
    {
      task_id:'readiness-a',readiness_id:'a',status:'HUMAN_REQUIRED',
      started_at:'2026-09-29T19:00:00Z',resources:['r1'],
      evidence_ids:['automated-runtime:a'],human_final:{required:true,status:'PENDING'}
    },
    {
      task_id:'readiness-b',readiness_id:'b',status:'DONE',
      started_at:'2026-09-29T19:05:00Z',
      validators_result:{Judge:'PASS',Sentinel:'PASS'},
      evidence_ids:['evidence:b']
    }
  ]
  const {readiness,summary}=evaluateFunctionalReadiness({functionalReadiness:base,locks,maxParallel:2,now:new Date('2026-09-29T20:00:00Z')})
  const items=readiness.groups[0].items
  const b=items.find(x=>x.id==='b')
  assert.equal(b.status,'NEEDS_RUNTIME_PROOF')
  assert.equal(b.gate_state,'BLOCKED_DEPENDENCY')
  assert.equal(b.blocked_verified_lock,true)
  assert.deepEqual(b.blocked_verified_dependencies,['a'])
  assert.ok(!summary.runnable_ids.includes('b'))
})
