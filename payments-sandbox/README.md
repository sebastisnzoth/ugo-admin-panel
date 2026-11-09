# UGO Pagamentos V2 — isolated Asaas Sandbox (Preview only)

This deployment is **not** Arena production. It uses its own Vercel project,
a dedicated Neon TEST database and the Asaas **Sandbox** base URL.

## HTTP endpoints

- `GET /api/health`: no secrets; confirms isolated read-only DB health and
  whether the authenticated TEST write capability is configured.
- `GET /api/wallets?account=issuer`: operator bearer token required;
  authenticated Asaas issuer-wallet verification.
- `GET /api/customers`: operator bearer token required; returns the unique
  existing Asaas Sandbox customer ID only if unambiguous.
- `POST /api/pix`: operator bearer token required. JSON `action` is one of:
  - `create`: fetches the sole existing Sandbox customer and verifies the issuer
    wallet, transactionally reserves the one synthetic R$100 service in Neon TEST,
    makes **at most one** Asaas POST charge and persists its ID before returning
    the official QR. Repeated requests reuse an existing PENDING charge or fail
    closed if a previous result was uncertain.
  - `confirm`: independently reads the registered Asaas charge, locks the
    confirmation locally, sends Sandbox-only payment confirmation and then
    rereads Asaas.
  - `reconcile`: authenticated remote readback and isolated Neon status update,
    without creating a charge or pretending a payout occurred.
  - `recover_create`: one-time guarded recovery only for an uncertain unlinked
    intent, after a fresh authenticated remote lookup proves zero matches.
    HTTP 400 manual-review intents are **not** eligible for this action.
  - `diagnose`: read-only issuer/customer/account check plus remote lookup for
    the currently configured synthetic service. No financial writes.
  - `audit_intents`: read-only inventory of up to 20 Sandbox intents. Queries
    Asaas exclusively for canonical `ugo_pix_test_<32 hex chars>` references;
    older noncanonical synthetic fixtures are counted as skipped. Reports only
    counts of remote matches, absence and ambiguity—no IDs or customer data.
    This audit **never** unlocks retries or rewrites financial state.


All financial routes are **POST**, denied outside `VERCEL_ENV=preview`,
and require `Authorization: Bearer <UGO_TEST_OPERATOR_TOKEN>`.
Never paste a token into a browser URL, GitHub issue or build log.
The operator token is an independent TEST secret; it is not the Asaas key.

## Isolated Preview-only environment

- `UGO_PAYMENTS_TEST_ONLY=1`
- `UGO_TEST_OPERATOR_TOKEN` (secret)
- `UGO_NEON_TEST_READONLY_URL` (restricted role, health)
- `UGO_NEON_TEST_WRITE_URL` (restricted TEST-only role; never PROD)
- `UGO_PIX_TEST_SERVICE_ID` (synthetic Faxina fixture, exactly R$100)
- `ASAAS_SANDBOX_API_KEY` (secret)
- `UGO_ASAAS_ISSUER_WALLET_ID` (validated with authenticated Asaas API)

There is **no** provider wallet, no external Asaas Split, no provider payout,
no escrow release and no production payment flow. The local 85/15 allocation
is only a projection based on Asaas's proven net value once `RECEIVED`.

## Fail-closed financial behavior

The Neon `payment_intents` table has unique constraints by TEST service and
external reference. Creation locks `test_services` before inserting the
reservation. On a timeout, unexpected response, failed save or ambiguous POST,
the intent is `unknown_processor_result`; **do not blindly retry**. Inspect
the Asaas Sandbox account for that external reference and reconcile under
operator control. A confirmed payment is not proof of external Split settlement.

The production main branch, Arena PROD and all real balances remain untouched.
Run the full test suite and complete authenticated Asaas/Neon E2E before claiming
`UGO PIX SANDBOX E2E — PASS`. Reconciliation markers written here are local
verification events, not evidence that an Asaas webhook was received.

## Current launch blockers

- The sole Sandbox payer has no CPF/CNPJ recorded. The `create` preflight now
  returns `payer_document_missing` before making a charge POST; update the
  **existing** payer with authorized data before requesting a new payment.
  This does not independently establish the original HTTP 400 cause.
- The 2026-11-07 HTTP 400 validation response must be retrieved from the
  authenticated Asaas request log (ticket #1994492).
- Do not reset the outstanding `manual_review` intent or infer that the older
  synthetic `creating` rows are actual Asaas charges.
- A real 85/15 external Split requires an independently verified recipient
  Asaas wallet; this single-wallet endpoint intentionally never includes a
  `split` array or transfers money to a provider.
- Per Asaas Split documentation, `percentualValue` is calculated on the
  **net** payment amount, and undistributed net stays in the issuing account.
  Native Split is automatic on receipt and **does not** provide a configurable
  payout release date or proof of escrow.
