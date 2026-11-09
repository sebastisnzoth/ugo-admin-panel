#!/usr/bin/env node
// Read-only release gate. Never contacts Asaas, Neon, Supabase or Vercel.
import { readFileSync } from 'node:fs'

const evidence = JSON.parse(readFileSync(new URL('../docs/evidence/pagamentos-v2-arena-20261109.json', import.meta.url), 'utf8'))
const blockers = []
if (evidence.pixSandboxE2E?.result !== 'UGO PIX SANDBOX E2E — PASS') blockers.push('PIX_E2E')
if (evidence.cleanPreview?.state !== 'READY' || evidence.cleanPreview?.financialProbeRemoved !== true) blockers.push('CLEAN_PREVIEW')
for (const [gate, status] of Object.entries(evidence.releaseGates || {})) {
  const accepted = status === 'PASS' || (gate === 'previewCodeRollback' && status === 'PASS_REDEPLOY_ONLY')
  if (!accepted) blockers.push(gate)
}
for (const required of ['splitReal8515', 'operationalAuthRealtimeRls', 'backupRestore', 'productionAuthorization', 'realServiceAndCommission']) {
  if (!evidence.releaseGates?.[required]) blockers.push(`MISSING_${required}`)
}
const result = [...new Set(blockers)]
if (result.length) {
  console.error('UGO RELEASE CANDIDATE — BLOCKED ' + JSON.stringify({ blockers: result, productionChanged: false }))
  process.exitCode = 1
} else {
  console.log('UGO RELEASE CANDIDATE — ELIGIBLE_FOR_EXPLICIT_PRODUCTION_APPROVAL')
}
