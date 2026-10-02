# UGO Architecture

## Scope

UGO is a React + TypeScript marketplace backed by Supabase, serverless API endpoints and external integrations. This document describes the current direction and the import boundaries expected for production code.

## Layers

### Presentation
- `src/mvp/`: role applications and operational screens.
- `src/features/`: feature-owned flows and UI.
- `src/shared/`: shared UI/runtime utilities that do not depend on server code.

### Application
- feature flow/state modules under `src/features/**`.
- reusable client-side hooks and libraries under `src/hooks/` and `src/lib/`.

### API / server application
- `api/`: HTTP/serverless entry points. Endpoints should be thin adapters.
- `server/`: server-only authorization, policies, domain helpers and adapters.

### Infrastructure
- `supabase/`: migrations, Edge Functions and database configuration.
- external adapters for Gemini/OpenRouter, Gmail, Calendar and other providers stay server-side.

## Dependency rules

1. Browser code must not import `api/` or `server/`.
2. API handlers may import server modules and shared pure types/helpers.
3. Server modules must not import React components.
4. Secrets and service-role credentials never enter browser bundles.
5. External model output is untrusted input and must pass schema/policy validation before any effect.
6. Database authority remains enforced by Auth/RLS/RPC; frontend visibility is not an authorization boundary.
7. Avoid new cross-feature imports when a shared contract is sufficient.

## Hugo request flow

```text
HTTP request
  -> origin validation
  -> bearer/session validation
  -> persisted profile authority
  -> bounded/sanitized model input
  -> model adapter
  -> response parsing
  -> UI-action permission policy
  -> compatible JSON response
```

Current backend boundaries:

- `api/hugo/chat.ts`: HTTP orchestration.
- `server/hugo/auth.ts`: session and profile authority.
- `server/hugo/cors.ts`: browser-origin policy.
- `server/hugo/security.ts`: redaction and model-bound sanitization.
- `server/hugo/authority.ts`: requested role vs persisted role.
- `server/hugo/permissions.ts`: centralized role capability matrix.
- `server/hugo/uiAction.ts`: allowlisted UI-action parsing.
- `server/hugo/promptBuilder.ts`: role-specific prompt construction.
- `server/hugo/modelAdapter.ts`: sanitized/bounded model input adapter.
- `server/hugo/modelRouter.ts`: Gemini/OpenRouter routing and fallback telemetry.
- `server/hugo/ttsAdapter.ts`: bounded Gemini TTS integration and audio parsing.

The visible Hugo/orb surfaces are currently disabled. Dormant voice code must not be treated as proof that the UI feature is active.

## Adding a backend module

1. Define the server-side contract.
2. Keep auth/permission checks before business effects.
3. Add positive and negative contract tests.
4. Run build + targeted tests + Core CI.
5. Persist SAME-SHA evidence before declaring the change verified.

## Adding an endpoint

Keep the HTTP handler responsible for transport only: parse request, validate origin/auth, call an application/server function, map errors and return the stable response contract. Do not duplicate policy or secrets handling inside the handler.

## Migration strategy

Refactors should be incremental:
1. extract a stable boundary;
2. preserve the public contract;
3. add tests around the new boundary;
4. prove same-SHA CI/runtime;
5. only then remove the old implementation.
