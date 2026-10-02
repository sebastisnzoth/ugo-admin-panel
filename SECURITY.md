# UGO Security Policy

## Principles

- Fail closed on authentication, authority and protected environment checks.
- Use least privilege.
- Treat LLM/model output as untrusted data.
- Never use CORS, UI visibility or prompt wording as authorization.
- Production changes require explicit human authorization.

## Secrets

Never commit, log or send to an LLM:
- Bearer/JWT/access/refresh tokens;
- Supabase service-role keys;
- API keys and client secrets;
- database passwords;
- private webhook secrets;
- raw credentials or recovery codes.

Secrets belong in protected environment configuration or approved server-side secret storage.

## Authentication and authority

For Hugo/server actions:
1. extract Bearer token;
2. verify it with Supabase Auth;
3. read persisted `usuarios.tipo,activo` through the authenticated session;
4. compare requested surface role against the persisted role;
5. deny inactive or mismatched profiles.

A role supplied by the browser never upgrades the persisted role.

## LLM data boundary

`server/hugo/contextPolicy.ts` enforces role-aware top-level allowlists for the Vercel/API runtime. Supabase Edge runtimes use the matching shared boundary in `supabase/functions/_shared/hugoPolicy.ts`; both `hugo-runtime` and legacy `hugo-chat` import it. Structured JSON context is filtered after session/role verification and before prompt construction. Unknown top-level fields are dropped. Secret/credential keys and sensitive contact/identity fields are removed recursively; Admin/Super Admin model context also drops exact latitude/longitude fields. Legacy text context is bounded and passed through secret + sensitive-contact redaction for compatibility. Edge CORS also uses the shared explicit origin allowlist; wildcard browser CORS is forbidden.

Allowed:
- bounded operational context already authorized for the current user;
- service/category/workflow state needed for the request;
- sanitized recent conversation history;
- admin operational data only after verified admin authority.

Blocked:
- secrets/tokens/credentials;
- private configuration;
- unrelated third-party PII;
- arbitrary database rows not required by the request;
- large raw blobs unless an explicitly reviewed feature requires them.

All model-bound text uses the server sanitization boundary as defense in depth.

## UI actions

The model may propose an action, but policy code decides whether it is valid. Admin actions pass through `server/hugo/uiAction.ts` and `server/hugo/permissions.ts`; Admin cannot target Super Admin and Super Admin targeting requires verified Super Admin authority. Provider model output is navigation-only: online/offline, accepting/rejecting work and lifecycle state changes are rejected when proposed by the LLM and remain owned by deterministic app commands/guards.

## CORS

Browser origins must be same-origin or explicitly allowlisted. Unknown browser origins receive 403. Requests without `Origin` are treated as non-browser/server requests and still require authentication where applicable.

## Supabase

- Never disable RLS to fix a failing flow.
- Review SECURITY DEFINER functions and `search_path`.
- Keep service-role usage server-side.
- Protected mutations require positive and negative tests.

## Rate limiting

Hugo applies fixed-window defense-in-depth rate limits before expensive model work in both Vercel/API and Supabase Edge runtimes: an IP bucket before parsing/auth plus an authenticated-user bucket after authority checks. TTS/Live use stricter limits. Rejections use HTTP 429 + `Retry-After`.

These guards are intentionally per serverless instance/isolate and are **not** a distributed global quota. A platform/WAF or durable shared limiter remains the correct layer for global abuse control.

## Logging

Log correlation IDs, route/provider, status and bounded timing. Do not log authorization headers, session tokens, full model context, passwords or secrets.

## Vulnerability reporting

Do not open a public issue containing exploitable details or credentials. Report the finding privately to the repository owner/maintainer, include affected SHA/path, impact, reproduction steps without secrets, and a proposed mitigation.

## Required security gates

Critical changes must cover:
- missing/invalid auth;
- inactive/mismatched roles;
- escalation attempts;
- secret redaction;
- invalid origins;
- unauthorized UI actions;
- stable external response contracts.
