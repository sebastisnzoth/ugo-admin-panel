// Local Hive agent runner: existing scheduler selects a task, FreeLLMAPI answers it.
// Deliberately no Supabase/GitHub writes or autonomous system execution.
import { scheduleTasks } from './ugo-scheduler-engine.mjs';
import { createLocalModelClient } from './hive-local-freellmapi-client.mjs';

export async function runLocalHiveAgent({ task, modelClient, policy, locks = [] }) {
  if (!task || typeof task.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(task.id))
    throw new Error('HIVE_INVALID_TASK');
  if (typeof task.prompt !== 'string' || !task.prompt.trim() || task.prompt.length > 4000)
    throw new Error('HIVE_INVALID_PROMPT');
  if (typeof task.model !== 'string' || !task.model.trim())
    throw new Error('HIVE_MODEL_REQUIRED');
  if (!policy || typeof policy !== 'object')
    throw new Error('HIVE_POLICY_REQUIRED');
  // Only a single explicitly approved read-only inference task can execute.
  if (task.capability !== 'inference-only' || task.requires_approval !== false || task.depends_on?.length)
    throw new Error('HIVE_LOCAL_UNSUPPORTED_CAPABILITY');
  const plan = scheduleTasks({
    tasks: [{ id: task.id, order: 0, resources: ['model-router'], depends_on: [] }],
    locks,
    policy: { ...policy, max_parallel_tasks: 1,
      resource_capacities: { ...policy.resource_capacities, 'model-router': 1 } }
  });
  if (plan.runnable.length !== 1 || plan.runnable[0].id !== task.id)
    return { task_id: task.id, status: 'BLOCKED', gate: plan.tasks[0]?.gate_state || 'UNKNOWN' };
  const client = modelClient || createLocalModelClient();
  const result = await client.complete({
    model: task.model,
    messages: [
      { role: 'system', content: 'You are a Hive agent operating in read-only analysis mode. No tools or external actions are available. Never claim to have executed actions.' },
      { role: 'user', content: task.prompt }
    ]
  });
  return { task_id: task.id, status: 'COMPLETED_LOCAL_INFERENCE', model: result.model, answer: result.answer };
}

// Explicit CLI invocation only. Nothing runs on import, at boot, or on a schedule.
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const policy = JSON.parse(await readFile(resolve(root, 'docs/UGO_SCHEDULER_POLICY.json'), 'utf8'));
  const task = { id: 'hive-local-inference', prompt: process.env.HIVE_LOCAL_PROMPT || 'Respond only: UGO HIVE LOCAL OK',
    model: process.env.HIVE_LOCAL_MODEL || 'qwen3-coder', capability: 'inference-only', requires_approval: false };
  const result = await runLocalHiveAgent({ task, policy });
  process.stdout.write(JSON.stringify(result) + '\n');
}
