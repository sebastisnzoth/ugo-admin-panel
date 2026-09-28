import { createClient } from '@supabase/supabase-js'

const url = process.env.UGO_TEST_SUPABASE_URL || ''
const key = process.env.UGO_TEST_SUPABASE_SERVICE_ROLE_KEY || ''
if (url !== 'https://tmossnqfwfwjrtzwcbmm.supabase.co' || !key) {
  throw new Error('UGO_TEST_SERVICE_ROLE_REQUIRED')
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const { data: agent, error: agentError } = await db.from('autonomous_agents')
  .select('id,status').eq('agent_key', 'deterministic-judge').single()
if (agentError) throw agentError
if (agent.status !== 'IDLE') throw new Error('QA_JUDGE_NOT_ENABLED')

for (const scenarioKey of ['provider-radius', 'payments', 'service-lifecycle']) {
  const { data: scenario, error: scenarioError } = await db.from('autonomous_qa_scenarios')
    .select('id,service_id').eq('scenario_key', scenarioKey).single()
  if (scenarioError) throw scenarioError
  if (!scenario.service_id) throw new Error(`QA_SCENARIO_UNBOUND:${scenarioKey}`)

  const { data: run, error: runError } = await db.from('autonomous_qa_runs')
    .select('id,status,judge_agent_id,judge_result,correlation_id')
    .eq('scenario_id', scenario.id).order('finished_at', { ascending: false }).limit(1).single()
  if (runError) throw runError
  if (run.status !== 'PASSED' || run.judge_agent_id !== agent.id ||
      run.judge_result?.source !== 'PERSISTED_TEST_STATE') {
    throw new Error(`QA_JUDGE_RUN_NOT_VERIFIED:${scenarioKey}`)
  }

  const { data: job, error: jobError } = await db.from('autonomous_jobs')
    .select('id,status,agent_id,service_id,correlation_id,verification_result')
    .eq('idempotency_key', `qa-judge:${run.id}`).single()
  if (jobError) throw jobError
  if (job.status !== 'SUCCEEDED' || job.agent_id !== agent.id ||
      job.service_id !== scenario.service_id || job.correlation_id !== run.correlation_id ||
      job.verification_result?.source !== 'PERSISTED_TEST_STATE' ||
      job.verification_result?.simulated_service !== true) {
    throw new Error(`QA_JUDGE_JOB_NOT_VERIFIED:${scenarioKey}`)
  }

  const [evidence, decision] = await Promise.all([
    db.from('autonomous_evidence_ledger').select('id', { count: 'exact', head: true }).eq('job_id', job.id),
    db.from('autonomous_decision_ledger').select('id', { count: 'exact', head: true }).eq('job_id', job.id),
  ])
  if (evidence.error) throw evidence.error
  if (decision.error) throw decision.error
  if (evidence.count !== 1 || decision.count !== 1) {
    throw new Error(`QA_JUDGE_LEDGER_INCOMPLETE:${scenarioKey}`)
  }
}
console.log('UGO TEST persisted-state QA judge verified: 3 scenarios, jobs and ledgers')
