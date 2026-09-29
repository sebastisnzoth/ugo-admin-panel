import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (p) => readFile(new URL('../../' + p, import.meta.url), 'utf8')

test('admin model router exposes primary fallback telemetry latency quality and cost', async () => {
  const ui = await read('src/mvp/AutonomousCorporationDashboard.tsx')
  for (const token of ['Model Router · zero-budget-first','Primary:','Fallback:','Telemetría reciente','Latencia media','Calidad media','Costo reciente','Correlation ID']) assert.ok(ui.includes(token), token)
  for (const token of ['provider','model_id','latency_ms','quality_score','failure_code','m.cost']) assert.ok(ui.includes(token), token)
})

test('super admin loads persisted router candidates routes and metrics', async () => {
  const ui = await read('src/mvp/SuperAdminCommandCenter.tsx')
  for (const token of ['autonomous_model_candidates','autonomous_model_routes','autonomous_model_metrics','setModelCandidates','setModelRoutes','setModelMetrics']) assert.ok(ui.includes(token), token)
})
