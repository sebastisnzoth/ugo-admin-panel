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
  - `get_qr`: operator-authenticated read-only retrieval of the original QR Pix and copia-e-cola for a locally linked charge that Asaas still reports as `PENDING`. Never creates another charge, never returns a payable QR after `RECEIVED`, and never updates a balance. This response contains payment material; keep it out of logs and expose it only to authorized TEST operators.\n  - `confirm`: independently reads the registered Asaas charge, locks the
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

  - `prepare_customer`: explicitly operator-triggered Sandbox-only update of the
    **one existing** fictitious payer, when its CPF/CNPJ is absent. Generates a
    checksum-valid synthetic CPF using cryptographic randomness and updates
    that customer's `cpfCnpj` with `notificationDisabled:true` via Asaas
    `PUT /v3/customers/{id}`. It never creates a second customer and
    never returns the synthetic CPF, person data or API credentials. If the
    payer already has a document, it performs no update. No charge, split or
    payout occurs in this action.


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

## Sandbox customer without a second real CPF

Asaas officially permits fictitious data in its Sandbox for homologation:
https://docs.asaas.com/docs/aprovação-de-contas

To update a customer without creating a duplicate, Asaas documents:
https://docs.asaas.com/reference/atualizar-cliente-existente

The authenticated `prepare_customer` action is explicitly isolated to a
Vercel **Preview** deployment, `UGO_PAYMENTS_TEST_ONLY=1`, and the private
operator bearer token. It is not called from `create`. It cannot be invoked by
the public Cliente or Provedor apps.

**Run only in the authorized TEST Preview:** request `POST /api/pix` with
`{"action":"prepare_customer"}` and the existing operator bearer token.
Never put that token in URL parameters, source files, tickets, chat, or logs.
Verify with the read-only `diagnose` action afterward.

This does not make the outstanding rejected Pix charge safe to retry.
Run `audit_intents` in TEST and obtain the historical Asaas HTTP 400 request
details before operator reconciliation. The Sandbox-only generated CPF is
not a real person's identity and must never be migrated to production.

## Independent received Pix evidence (read-only)

For a TEST payment intent already marked `received` and linked to an Asaas
Sandbox payment ID, the authenticated operator can issue
`POST /api/pix` with `{"action":"verify_received"}` **only in Preview**.
This performs a single Asaas `GET /v3/payments/{id}` and requires the
canonical test service, external reference, customer, billing type, R$ 100
gross amount and processor's `RECEIVED` status with exactly the locally
recorded net amount. It does not call `POST /payments`, confirm a payment,
update Neon, issue a Pix code, or transfer funds.

Sanitized response fields distinguish `paymentVerified` from
`pixQrProofPresent:false`, `e2ePass:false`,
`splitSettled:false`, and `providerPaid:false`; they do **not** assert
Pix E2E completion. Handle mismatches without retries. Keep the API bearer
token private; never paste it into tickets, messages or version control.
