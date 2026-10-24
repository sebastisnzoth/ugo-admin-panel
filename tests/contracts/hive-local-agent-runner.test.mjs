import test from 'node:test';
import assert from 'node:assert/strict';
import { runLocalHiveAgent } from '../../scripts/hive-local-agent-runner.mjs';

const policy = { version:'TEST', max_parallel_tasks:5, task_policies:{},
  resource_capacities:{'model-router':1}, priorities:{NORMAL:50} };
const task = { id:'hive-local-smoke', prompt:'Say OK', model:'qwen3-coder',
  capability:'inference-only', requires_approval:false };

test('existing scheduler authorizes one safe local inference', async () => {
  let calls=0;
  const result=await runLocalHiveAgent({task,policy,modelClient:{complete:async request=>{
    calls++;
    assert.equal(request.model,'qwen3-coder');
    assert.match(request.messages[0].content,/read-only/);
    return {model:'qwen3-coder',answer:'OK'};
  }}});
  assert.equal(calls,1);
  assert.deepEqual(result,{task_id:task.id,status:'COMPLETED_LOCAL_INFERENCE',model:'qwen3-coder',answer:'OK'});
});
test('active lease blocks invocation before model request', async () => {
  let calls=0;
  const result=await runLocalHiveAgent({task,policy,
    locks:[{task_id:task.id,status:'IN_PROGRESS',started_at:'2026-10-22T00:00:00Z',
      lease_expires_at:'2099-01-01T00:00:00Z',resources:['model-router']}],
    modelClient:{complete:async()=>{calls++;throw Error('must not run')}}});
  assert.equal(result.status,'BLOCKED');
  assert.equal(calls,0);
});
test('rejects write capable and ambiguous tasks', async () => {
  for(const bad of [{...task,capability:'github-write'},{...task,requires_approval:true},
    {...task,depends_on:['another-task']},{...task,prompt:''}]){
    await assert.rejects(runLocalHiveAgent({task:bad,policy,modelClient:{complete:()=>{throw Error('unsafe')}}}),
      /HIVE_/);
  }
});
