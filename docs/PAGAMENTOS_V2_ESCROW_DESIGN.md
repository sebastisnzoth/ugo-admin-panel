# UGO Pagamentos V2 — escrow/repasse (isolated phase 0)

Status: **design + pure offline policy tests only**. No production activation, API credentials, migrations, deployment, provider calls, or modifications to existing checkout.

## Existing architecture

- `api/pagos/crear.ts` issues Mercado Pago Pix/OpenPix sandbox/direct Pix, persists `pagos`, and currently models provider earnings, commission, and `retenido`.
- `src/mvp/ProviderPayoutPanel.tsx` displays `saldo_proveedor` and allows withdrawal requests to `api/retiros/solicitar.ts`.
- `src/mvp/ProviderMercadoPagoConnect.tsx` supports Mercado Pago OAuth connection.
- `docs/PAYMENTS_MULTIPAIS_PHASE1.md` requires flags off by default and sandbox checks before any rollout.

**Warning:** Current database state `retenido` does not prove a processor-level escrow. Do not advertise it as held money.

## Processor feasibility

Asaas documents subaccount Conta Escrow with automatic expiry (up to 45 days) and early manual release, plus Pix split by `walletId`. Escrow may have recurring per-subaccount charges. Split is computed from net amount, after processor fees. `PAYMENT_SPLIT_DONE` is evidence of split settlement, **not proof escrow funds are available**. The escrow state must be queried from Asaas.

References:
- https://docs.asaas.com/docs/introducao-conta-escrow
- https://docs.asaas.com/docs/split-para-contas-com-conta-escrow
- https://central.ajuda.asaas.com/hc/pt-br/articles/34119874855323-Quando-o-dinheiro-%C3%A9-liberado-na-Conta-Escrow-do-Asaas

## Intended workflow

1. Onboard verified provider subaccount; obtain wallet ID, KYC and escrow eligibility; contract costs and expiry.
2. Configure escrow on provider subaccount **before** receiving money.
3. Customer pays Pix via processor, not direct unverified Pix; backend stores processor charge, gross, fee, net, guarantee ID, expiry, split IDs, and event IDs in *future* isolated ledger tables.
4. Processor-signed webhook is deduped; backend fetches source-of-truth status; payment receipt and escrow guarantee are separately recorded.
5. Completion of service and admin authorization permit **early** release only when no open dispute/refund; enforce atomic idempotent decision in DB before calling provider API.
6. Mark `released` only after processor status confirms matching guarantee. Expiration may auto-release independently of service status: notify and reconcile, never claim full control beyond expiry.
7. Reconcile charge, individual splits, fees, escrow and withdrawal with provider ledger. Refunds, disputes and provider account suspension are exception states.

## Non-negotiable controls before API wiring

- `PAGAMENTOS_V2_ENABLED=false` and `ASAAS_ESCROW_ENABLED=false` by default; no real processor credentials in client.
- Never call Asaas from React; secrets only in isolated server environment.
- Persisted unique keys for payment attempts, processor payment IDs, webhook event IDs and release requests.
- Verify webhook authenticity with provider-supported mechanisms and fetch processor state server-side.
- DB transaction/RPC with row locking for two simultaneous release attempts; one operation wins.
- RLS for per-user financial visibility; separation of duties for early release; complete audit trail.
- Controlled release only after exact service completion status mapping verified against current schema, dispute hold, and payout-account KYC.
- Avoid service role access by autonomous agents and any read/write load on Arena PROD.
- Test expiry, duplicate events, replay, concurrent release, network timeout, partial refund, double settlement, split divergence and processor fee changes in a fully isolated test DB.
- Financial/legal review: account owner (CPF/CNPJ), taxes, fee schedule, mandates and settlement contracts.

## This branch scope

`src/server/payments/escrowPolicy.mjs` and `tests/contracts/pagamentos-v2-escrow.test.mjs` introduce a **pure, unused** financial policy and offline contract tests. They are intentionally not wired into `router.ts`, Vercel endpoints, UI or database. Next phase needs signed-off processor account/sandbox and schema review before enabling any real release.

Run locally: `node --test tests/contracts/pagamentos-v2-escrow.test.mjs`
