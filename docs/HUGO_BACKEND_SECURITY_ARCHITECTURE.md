# Hugo backend security and architecture

## Scope

The visual Hugo/orb surfaces are intentionally disabled in Cliente, Proveedor, Admin and Super Admin. Backend Hugo code remains available only as a dormant/integration surface and must stay secure until product decides whether to re-enable it.

## Current boundaries

- `api/hugo/chat.ts`: HTTP orchestration and response contract only.
- `server/hugo/auth.ts`: bearer/session validation, profile lookup and requested-role authority.
- `server/hugo/security.ts`: length limiting and redaction before model/TTS calls.
- `server/hugo/cors.ts`: browser origin allowlist and same-origin policy.
- `server/hugo/authority.ts`: requested role vs persisted profile role.
- `server/hugo/permissions.ts`: centralized role capability matrix.
- `server/hugo/uiAction.ts`: allowlisted UI action parsing and role enforcement.
- `server/hugo/modelRouter.ts`: bounded model routing/fallback.

## LLM data policy

Allowed when required for the request:
- operational service state already authorized for the current user;
- category, workflow state, non-secret UI context;
- sanitized conversation history with bounded length;
- admin operational context only after verified admin authority.

Never send:
- Authorization/Bearer headers;
- JWT/access/refresh tokens;
- service-role keys, API keys, passwords or secrets;
- raw base64 blobs/images unless an explicitly audited feature requires them;
- data belonging to another user unless the verified server-side policy explicitly authorizes it.

All model-bound strings pass through `sanitizeForModel`. Sanitization is defense in depth and never replaces authorization/RLS.

## Role matrix

| Role | Own context | Operational context | Global governance | Server-returned UI actions |
| --- | --- | --- | --- | --- |
| client | yes | no | no | none |
| provider | yes | no | no | none |
| admin | yes | yes | no | refresh, navigate, open_service, map_filter |
| superadmin | yes | yes | yes | refresh, navigate, open_service, map_filter + superadmin target |

The LLM never grants authority. Session/profile checks happen first, and parsed UI actions are independently allowlisted after model output.

## CORS

Browser requests are accepted only when:
- no Origin header is present (server-to-server/non-browser use), or
- Origin host equals the request Host, or
- Origin is explicitly listed in the allowlist.

Unknown browser origins fail closed. Do not use CORS as authentication.

## Required CI protections

Critical:
- missing/invalid auth cannot reach model calls;
- role mismatch and inactive profile are denied;
- secrets are redacted before model-bound payloads;
- client/provider cannot receive admin UI actions;
- admin cannot navigate to Super Admin;
- unknown browser origins are denied;
- public JSON response contract remains compatible.

## Next extraction

Keep future changes incremental:
1. extract prompt construction to `server/hugo/promptBuilder.ts`;
2. extract TTS to `server/hugo/ttsAdapter.ts`;
3. remove dormant voice/UI code only after confirming no Android/runtime dependency still imports it;
4. add runtime integration tests against UGO TEST for auth/CORS without using production credentials.
