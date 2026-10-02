import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateFunctionalReadiness} from '../../scripts/ugo-readiness-engine.mjs'

const fixture=()=>({
  groups:[{
    id:'flow',
    title:'Flow',
    items:[
      {
        id:'human-gps',
        title:'GPS real',
        status:'HUMAN_FINAL',
        real_test_required:true,
        depends_on:[],
        resources:['gps'],
        priority:'FINAL',
      },
      {
        id:'lifecycle',
        title:'Lifecycle',
        status:'NEEDS_RUNTIME_PROOF',
        real_test_required:false,
        depends_on:['human-gps'],
        resources:['flow'],
        priority:'CRITICAL',
      },
      {
        id:'e2e',
        title:'E2E',
        status:'NEEDS_RUNTIME_PROOF',
        real_test_required:false,
        depends_on:['lifecycle'],
        resources:['e2e'],
        priority:'HIGH',
      },
    ],
  }],
})

test('human-required prerequisites never satisfy downstream autonomous gates',()=>{
  const {readiness,summary}=evaluateFunctionalReadiness({
    functionalReadiness:fixture(),
    locks:[{
      task_id:'readiness-human-gps',
      readiness_id:'human-gps',
      status:'HUMAN_REQUIRED',
      started_at:'2026-10-02T12:00:00.000Z',
      human_final_required:{required:true},
    }],
    now:new Date('2026-10-02T12:05:00.000Z'),
  })
  const items=readiness.groups[0].items
  const human=items.find(x=>x.id==='human-gps')
  const lifecycle=items.find(x=>x.id==='lifecycle')
  const e2e=items.find(x=>x.id==='e2e')

  assert.equal(human.gate_state,'HUMAN_REQUIRED')
  assert.equal(lifecycle.gate_state,'BLOCKED_DEPENDENCY')
  assert.deepEqual(lifecycle.unresolved_dependencies,['human-gps'])
  assert.equal(e2e.gate_state,'BLOCKED_DEPENDENCY')
  assert.deepEqual(e2e.unresolved_dependencies,['lifecycle'])
  assert.equal(summary.available_now,0)
  assert.deepEqual(summary.runnable_ids,[])
})

test('human-blocked downstream gates are not counted as autonomous work remaining',()=>{
  const {readiness,summary}=evaluateFunctionalReadiness({
    functionalReadiness:fixture(),
    now:new Date('2026-10-02T12:05:00.000Z'),
  })
  const human=readiness.groups[0].items.find(x=>x.id==='human-gps')

  assert.equal(summary.remaining_autonomous,0)
  assert.equal(human.gate_state,'HUMAN_REQUIRED')
  assert.equal(summary.human_required,1)
  assert.equal(summary.human_deferred,0)
})
