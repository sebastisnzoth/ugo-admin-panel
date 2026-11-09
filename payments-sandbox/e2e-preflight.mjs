// Transient Vercel Preview build E2E. Secrets, payer data, payment IDs and QR
// payloads never enter logs. All financial behavior remains in pix.js.
import { createHash } from 'node:crypto'
import handler from './api/pix.js'

const paymentKey = value => typeof value === 'string' && value
  ? createHash('sha256').update(value).digest('hex').slice(0, 12)
  : null

async function run(action, confirmation) {
  const response = {
    statusCode: 500,
    body: null,
    setHeader() {},
    end(raw) { this.body = JSON.parse(raw) },
  }
  await handler({
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.UGO_TEST_OPERATOR_TOKEN}` },
    body: { action, ...(confirmation ? { confirmation } : {}) },
  }, response)
  const result = response.body
  const safe = result && typeof result === 'object' ? {
    environment: result.environment,
    action: result.action,
    error: result.error,
    processorValidationCodes: result.processorValidationCodes,
    processorValidationFields: result.processorValidationFields,
    processorStatus: result.processorStatus,
    alreadyPrepared: result.alreadyPrepared,
    payerDocumentPresent: result.payerDocumentPresent,
    notificationsDisabled: result.notificationsDisabled,
    walletVerified: result.walletVerified,
    uniqueCustomer: result.uniqueCustomer,
    accountApproved: result.accountApproved,
    localIntentStatus: result.localIntentStatus,
    localPaymentLinked: result.localPaymentLinked,
    remoteLookupConclusive: result.remoteLookupConclusive,
    remoteChargeCount: result.remoteChargeCount,
    localIntentCount: result.localIntentCount,
    checked: result.checked,
    remoteAbsent: result.remoteAbsent,
    remotePresent: result.remotePresent,
    remoteAmbiguous: result.remoteAmbiguous,
    legacySyntheticSkipped: result.legacySyntheticSkipped,
    paymentKey: paymentKey(result.paymentId),
    qrCopyPastePresent: typeof result.qrCopyPaste === 'string' && result.qrCopyPaste.length > 20,
    qrImagePresent: typeof result.qrImageBase64 === 'string' && result.qrImageBase64.length > 20,
    splitSettled: result.splitSettled,
    providerPaid: result.providerPaid,
    projection: result.projection,
  } : null
  for (const key of Object.keys(safe || {})) {
    if (safe[key] === undefined) delete safe[key]
  }
  console.log('UGO_SANDBOX_STEP ' + JSON.stringify({ action, status: response.statusCode, result: safe }))
  return response
}

function requireOk(response, label) {
  if (response.statusCode !== 200 || !response.body) {
    throw new Error(`${label}_failed_${response.statusCode}`)
  }
  return response.body
}

try {
  requireOk(await run('prepare_customer'), 'prepare')
  const initial = requireOk(await run('diagnose'), 'initial_diagnose')
  requireOk(await run('audit_intents'), 'initial_audit')

  let charge
  if (initial.localIntentStatus === 'manual_review' && !initial.localPaymentLinked && initial.remoteChargeCount === 0) {
    charge = requireOk(await run('recover_rejected', 'RETRY_REJECTED_R100'), 'rejected_recovery')
  } else if (initial.localIntentStatus === 'pending' && initial.localPaymentLinked) {
    charge = requireOk(await run('create'), 'existing_charge_reuse')
  }

  if (charge) {
    if (!['created', 'recovered_created', 'reused'].includes(charge.action) ||
        typeof charge.paymentId !== 'string' || !charge.paymentId ||
        typeof charge.qrCopyPaste !== 'string' || charge.qrCopyPaste.length <= 20 ||
        typeof charge.qrImageBase64 !== 'string' || charge.qrImageBase64.length <= 20) {
      throw new Error('official_qr_contract_failed')
    }
    if (charge.action !== 'reused') {
      const repeated = requireOk(await run('create'), 'idempotency')
      if (repeated.action !== 'reused' || repeated.paymentId !== charge.paymentId ||
          typeof repeated.qrCopyPaste !== 'string' || repeated.qrCopyPaste.length <= 20) {
        throw new Error('idempotent_reuse_failed')
      }
    }
  }

  await run('confirm')
  requireOk(await run('reconcile'), 'reconciliation')
  const final = requireOk(await run('diagnose'), 'final_diagnose')
  requireOk(await run('audit_intents'), 'final_audit')
  if (!final.localPaymentLinked || final.remoteChargeCount !== 1 ||
      !['confirmed', 'received'].includes(final.localIntentStatus)) {
    throw new Error('final_authenticated_state_failed')
  }
  console.log('UGO PIX SANDBOX E2E — PASS ' + JSON.stringify({
    remoteChargeCount: final.remoteChargeCount,
    localIntentStatus: final.localIntentStatus,
    splitSettled: false,
    providerPaid: false,
  }))
} catch (error) {
  console.error('UGO PIX SANDBOX E2E — BLOCKED ' + String(error.message).replace(/[^A-Za-z0-9_— -]/g, '').slice(0, 120))
  process.exitCode = 1
}

if (!process.exitCode) {
  const { mkdir, writeFile } = await import('node:fs/promises')
  await mkdir('dist', { recursive: true })
  await writeFile('dist/index.html', '<!doctype html><title>UGO Pix Sandbox E2E PASS</title>')
}
