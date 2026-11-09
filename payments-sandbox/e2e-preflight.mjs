// Transient Vercel Preview build probe. Never prints environment values, payer
// data or processor bodies: pix.js responses are sanitized by contract.
import handler from './api/pix.js'

async function run(action) {
  const response = {
    statusCode: 500,
    body: null,
    setHeader() {},
    end(raw) { this.body = JSON.parse(raw) },
  }
  await handler({
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.UGO_TEST_OPERATOR_TOKEN}` },
    body: { action },
  }, response)
  console.log('UGO_SANDBOX_STEP ' + JSON.stringify({
    action,
    status: response.statusCode,
    result: response.body,
  }))
  if (response.statusCode !== 200) process.exitCode = 1
  return response.statusCode === 200
}

for (const action of ['prepare_customer', 'diagnose', 'audit_intents']) {
  if (!await run(action)) break
}
