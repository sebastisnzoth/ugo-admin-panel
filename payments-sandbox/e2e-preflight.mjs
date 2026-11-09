// Transient Vercel Preview build E2E. This commit deliberately performs only
// customer and Pix-key preparation; charge recovery remains a separate deploy.
import { createHash } from 'node:crypto'
import handler from './api/pix.js'

const paymentKey = value => typeof value === 'string' && value
  ? createHash('sha256').update(value).digest('hex').slice(0, 12) : null

async function run(action, confirmation) {
  const response = { statusCode: 500, body: null, setHeader() {}, end(raw) { this.body = JSON.parse(raw) } }
  await handler({ method: 'POST', headers: { authorization: `Bearer ${process.env.UGO_TEST_OPERATOR_TOKEN}` },
    body: { action, ...(confirmation ? { confirmation } : {}) } }, response)
  const result = response.body
  const safe = result && typeof result === 'object' ? {
    environment: result.environment, action: result.action, error: result.error,
    processorValidationCodes: result.processorValidationCodes,
    processorValidationFields: result.processorValidationFields,
    processorStatus: result.processorStatus, alreadyPrepared: result.alreadyPrepared,
    payerDocumentPresent: result.payerDocumentPresent, notificationsDisabled: result.notificationsDisabled,
    walletVerified: result.walletVerified, uniqueCustomer: result.uniqueCustomer,
    accountApproved: result.accountApproved, pixKeyCount: result.pixKeyCount,
    pixKeyActive: result.pixKeyActive, sandboxPixKeyCreated: result.sandboxPixKeyCreated,
    localIntentStatus: result.localIntentStatus, localPaymentLinked: result.localPaymentLinked,
    remoteLookupConclusive: result.remoteLookupConclusive, remoteChargeCount: result.remoteChargeCount,
    rejectedRecoveryAttempted: result.rejectedRecoveryAttempted,
    postKeyRecoveryAttempted: result.postKeyRecoveryAttempted,
    localIntentCount: result.localIntentCount, checked: result.checked,
    remoteAbsent: result.remoteAbsent, remotePresent: result.remotePresent,
    remoteAmbiguous: result.remoteAmbiguous, legacySyntheticSkipped: result.legacySyntheticSkipped,
    paymentKey: paymentKey(result.paymentId),
    qrCopyPastePresent: typeof result.qrCopyPaste === 'string' && result.qrCopyPaste.length > 20,
    qrImagePresent: typeof result.qrImageBase64 === 'string' && result.qrImageBase64.length > 20,
    splitSettled: result.splitSettled, providerPaid: result.providerPaid, projection: result.projection,
  } : null
  for (const key of Object.keys(safe || {})) if (safe[key] === undefined) delete safe[key]
  console.log('UGO_SANDBOX_STEP ' + JSON.stringify({ action, status: response.statusCode, result: safe }))
  return response
}
function requireOk(response, label) {
  if (response.statusCode !== 200 || !response.body) throw new Error(`${label}_failed_${response.statusCode}`)
  return response.body
}
try {
  requireOk(await run('prepare_customer'), 'prepare')
  const initial = requireOk(await run('diagnose'), 'initial_diagnose')
  requireOk(await run('audit_intents'), 'initial_audit')
  if (initial.localIntentStatus !== 'manual_review' || initial.localPaymentLinked || initial.remoteChargeCount !== 0) {
    throw new Error('preparation_requires_manual_review')
  }
  if (initial.pixKeyCount === 0) {
    requireOk(await run('prepare_pix_key', 'CREATE_EVP_SANDBOX_PIX_KEY'), 'prepare_pix_key')
  }
  const final = requireOk(await run('diagnose'), 'final_diagnose')
  if (final.pixKeyCount !== 1 || final.remoteChargeCount !== 0 || final.localPaymentLinked) {
    throw new Error('pix_key_preparation_verification_failed')
  }
  console.log('UGO PIX KEY PREPARATION — PASS ' + JSON.stringify({
    activePixKeyCount: final.pixKeyCount, remoteChargeCount: final.remoteChargeCount,
    chargeAttempted: false, nextAction: 'separate_explicit_post_key_recovery',
  }))
} catch (error) {
  console.error('UGO PIX KEY PREPARATION — BLOCKED ' + String(error.message).replace(/[^A-Za-z0-9_— -]/g, '').slice(0, 120))
  process.exitCode = 1
}
if (!process.exitCode) {
  const { mkdir, writeFile } = await import('node:fs/promises')
  await mkdir('dist', { recursive: true })
  await writeFile('dist/index.html', '<!doctype html><title>UGO Pix key preparation PASS</title>')
}
