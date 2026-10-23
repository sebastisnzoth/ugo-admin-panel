// Opt-in Hive local worker core. No inbound public port, no credentials embedded,
// no scheduling or autonomous execution; transport is deliberately injected.
// A server-side authorized claim and completion API must exist before use.
import { runLocalHiveAgent } from './hive-local-agent-runner.mjs';

export async function processHivePoll({claim, complete, policy, run = runLocalHiveAgent} = {}) {
  if (typeof claim !== 'function' || typeof complete !== 'function' || !policy)
    throw Error('HIVE_POLL_CONFIGURATION_REQUIRED');
  const job = await claim();
  if (job == null) return {status:'IDLE'};
  if (typeof job !== 'object' || Array.isArray(job) ||
      typeof job.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(job.id) ||
      typeof job.lease !== 'string' || job.lease.length < 32 ||
      typeof job.prompt !== 'string' || !job.prompt.trim() || job.prompt.length > 4000 ||
      job.capability !== 'inference-only' || job.authorized !== true ||
      Object.keys(job).some(k => !['id','lease','prompt','capability','authorized'].includes(k)))
    throw Error('HIVE_POLL_INVALID_JOB');
  // No commands, tool calls, file modifications, or user-controlled model selection.
  let outcome;
  try {
    const result = await run({task:{
      id:'hive-local-poll',prompt:job.prompt,model:'qwen3-coder-free',
      capability:'inference-only',requires_approval:false
    },policy});
    const validAnswer = result?.status === 'COMPLETED_LOCAL_INFERENCE' &&
      result.model === 'qwen3-coder-free' && typeof result.answer === 'string' &&
      result.answer.trim().length > 0 && result.answer.length <= 12000;
    outcome = validAnswer
      ? {status:'SUCCEEDED',answer:result.answer,model:'qwen3-coder-free'}
      : {status:'FAILED',code:'HIVE_INVALID_INFERENCE_RESULT'};
  } catch {
    outcome = {status:'FAILED',code:'HIVE_LOCAL_INFERENCE_FAILED'};
  }
  await complete({id:job.id,lease:job.lease,...outcome});
  return {status:outcome.status,id:job.id};
}
