# UGO support chat — security rollout (TEST ONLY)

## Current state
Code is committed in PR #597. NOT operational until migration and server-only settings are installed and tested. Do not merge without preview verification.

## Rate limiting
Atomic Supabase TEST RPC `ugo_support_check_limit`: 6 requests per minute per HMAC-anonymized network IP. No shared in-memory fallback. Missing or broken database => HTTP 503. Old buckets need scheduled cleanup. IP-level limiting is imperfect for carrier NAT, VPNs and adversaries; add provider firewall limits for broader abuse protection.

## Preview environment variables (server-side only; never VITE_*)
- `UGO_SUPPORT_SUPABASE_URL=https://tmossnqfwfwfwjrtzwcbmm.supabase.co`
- `UGO_SUPPORT_SUPABASE_SERVICE_KEY`: the service-role credential for **TEST**, not PROD.
- `UGO_SUPPORT_RATE_SECRET`: random secret at least 32 bytes, generated privately.
- `UGO_SUPPORT_ENABLED=true` only after rollout gates pass.
- `GEMINI_API_KEY`: already present on Vercel Preview.
- `UGO_SUPPORT_TURNSTILE_SECRET`: optional only after Turnstile widget is integrated and site key configured. If set, backend requires a valid token in `turnstileToken` and fails closed.

**Important:** The frontend does not currently request a Turnstile token. Setting `UGO_SUPPORT_TURNSTILE_SECRET` right now blocks all conversations. Implement widget + verify browser origins before enabling.

## Security gates
1. Apply migration exclusively to Supabase TEST.
2. Check RPC permissions: only service_role can execute; anon/authenticated cannot.
3. Set three required backend variables in Vercel Preview only.
4. Verify 503 when config missing, 429 on request seven within one minute, 405 GET, 403 invalid Origin and never echo API secrets.
5. Verify client and provider content in Portuguese and Spanish and no private order reads.
6. Validate deployment/CI, cross-instance rate limit and model costs before enabling `UGO_SUPPORT_ENABLED`.
7. Production requires separate service credentials and a deliberate security review. Current implementation pins TEST URL and MUST NOT be enabled on production.
