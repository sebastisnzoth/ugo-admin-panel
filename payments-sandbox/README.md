# UGO Pagamentos V2 — isolated Sandbox API

Independent **Vercel Preview** backend. No frontend, no shared Production
environment. The project is manually deployed and deliberately disconnected
from UGO Arena; there is no charge creation, confirmation or payout route.

## Files
- `api/health.js`: read-only Neon TEST connectivity check (returns only booleans).
- `api/wallets.js`: authenticated server-side Asaas Sandbox GET /v3/wallets/
  for issuer or provider. No POST and no user-supplied wallet IDs.
- `package.json`: locked direct Postgres client dependency.

## Required Preview-only variables
- `UGO_PAYMENTS_TEST_ONLY=1`
- `UGO_NEON_TEST_READONLY_URL`: dedicated read-only schema role.
- `UGO_TEST_OPERATOR_TOKEN`: strong independent bearer secret.
- `UGO_ASAAS_ISSUER_WALLET_ID`: verified against authenticated Asaas response.
- `ASAAS_SANDBOX_API_KEY`: new or securely provided Sandbox key (NOT inherited
  from the legacy Vercel Production project).
- `ASAAS_PROVIDER_SANDBOX_API_KEY`: provider's distinct Sandbox account API key.
- `UGO_ASAAS_PROVIDER_WALLET_ID`: provider's independently verified wallet.

GET /api/health returns service readiness. GET /api/wallets?account=issuer
or ?account=provider requires Authorization: Bearer <operator secret> and
will return 503 while account secrets are absent.

Both endpoints fail closed outside Vercel Preview. Never expose tokens in
frontend or logs. No payment creation is deployed. Do not promote this project
to Production. Do not use account secrets from Arena PROD.
