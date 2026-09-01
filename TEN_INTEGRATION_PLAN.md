# UGO + TEN Framework Integration Plan

## Objective

Integrate TEN Framework as UGO's real-time conversational voice layer without replacing the existing UGO architecture.

TEN will act as an independent AI/voice microservice that connects the Client App and Provider App to the existing UGO backend, Supabase memory, matching, services, payments and admin controls.

## Architectural decision

TEN does **not** replace:

- Supabase
- UGO Admin Panel
- Client App
- Provider App
- Existing Hugo/UGO memory tables and RPCs
- Matching logic
- Mercado Pago
- Maps/location services

TEN replaces or supersedes the previously planned Voiceflow/Twilio conversational bridge for the main real-time voice experience.

SIP/telephony may still be integrated when required.

## Target architecture

```text
Client App / Provider App
          |
          | WebSocket / RTC
          v
   UGO Voice Gateway
      (TEN Framework)
          |
          v
   UGO AI Orchestrator
          |
   +------+------+----------------+
   |             |                |
   v             v                v
Supabase     Hugo Memory      UGO APIs
   |         + Context       + Matching
   |                        + Services
   |                        + Payments
   |                        + Notifications
   +-------------+------------------+
                 |
                 v
            Response
          text + voice
```

## Core voice flows

### 1. Client requests a provider

Example:

> "UGO, necesito un electricista hoy cerca de casa."

Flow:

1. TEN receives audio.
2. Speech is converted to text.
3. Intent is classified as `find_provider`.
4. UGO loads client context using the existing memory/query layer.
5. UGO queries available providers by category, location, availability, rating and business rules.
6. The orchestrator returns structured provider options.
7. TEN speaks the result back to the client.
8. Conversation state is kept for follow-up commands.

Follow-up:

> "Mandame el mejor."

UGO resolves the previous provider list from session context and creates or advances the service request.

### 2. Provider operations

Examples:

- "UGO, ¿qué trabajos tengo hoy?"
- "Aceptá el servicio de las 15:00."
- "¿Quién fue mi mejor cliente este mes?"
- "Marcá que estoy disponible hasta las 20:00."

All write operations must pass authorization and confirmation rules.

### 3. Admin voice controls

Examples:

- "Desactivá temporalmente matching automático."
- "Mostrame proveedores con baja aceptación."
- "¿Cuántos servicios se completaron hoy?"

High-impact operations require explicit confirmation.

## Initial tool contract

TEN should call UGO through structured tools rather than directly querying tables from conversational code.

Recommended first tools:

```text
get_user_context(user_id, role)
find_providers(user_id, category, location, filters)
get_service(service_id)
create_service_request(client_id, provider_id, category, details)
accept_service(provider_id, service_id)
update_provider_availability(provider_id, status)
get_user_services(user_id, role, date_range)
get_feature_flags(scope)
log_voice_interaction(user_id, role, intent, payload)
```

## Security rules

1. TEN never receives a Supabase service-role key from the mobile/browser client.
2. TEN calls a protected UGO backend gateway.
3. Every request includes an authenticated UGO user/session identity.
4. Backend verifies role before executing tools.
5. Sensitive or irreversible actions require confirmation.
6. Voice transcripts must follow the same privacy model as Hugo interaction memory.
7. Feature flag `ten_voice_enabled` must allow instant shutdown without redeployment.

## Feature flags

Add or reuse feature flag infrastructure:

```json
{
  "feature_key": "ten_voice_enabled",
  "enabled": false,
  "grupo": "voice",
  "config": {
    "provider": "ten",
    "require_confirmation_for_writes": true,
    "log_transcripts": true,
    "max_session_minutes": 20
  }
}
```

Additional flags:

```text
ten_voice_client_enabled
ten_voice_provider_enabled
ten_voice_admin_enabled
ten_voice_write_actions_enabled
ten_voice_telephony_enabled
```

## Phase 1 — Proof of concept

Goal: prove one complete end-to-end voice flow.

Implement:

```text
voice input
  -> TEN
  -> find_provider intent
  -> UGO API
  -> Supabase provider query
  -> structured result
  -> TEN spoken response
```

Test phrase:

> "UGO, necesito un electricista cerca de mí."

Expected response:

> "Encontré proveedores disponibles cerca. El mejor calificado es X. ¿Querés que lo solicite?"

No automatic booking in the first test.

## Phase 2 — Conversational actions

Add:

- multi-turn context
- create service request
- provider accept/reject
- service status
- availability commands
- confirmation layer
- interaction logging

## Phase 3 — Mobile integration

Client App:

- microphone button
- listening state
- live transcript
- interruptible voice response
- fallback to text

Provider App:

- hands-free job status
- incoming-service voice summary
- accept/reject flow

## Phase 4 — Admin integration

Admin Panel should expose:

- TEN enabled/disabled
- active voice sessions
- latency
- failures
- tool-call success rate
- most common intents
- transcript logging configuration
- provider configuration

## Phase 5 — Telephony

Evaluate TEN SIP extension for optional phone-based service flows.

Possible use cases:

- UGO calling a provider when push notification is unanswered
- provider confirming availability by phone
- customer support line

Telephony must remain optional and isolated from the core in-app voice experience.

## Deployment model

Recommended separation:

```text
ugo-admin-panel
ugo-client
ugo-provider
ugo-api
ugo-ai / ugo-voice-agent  <-- TEN service
```

The TEN service should be containerized and deployed independently from the Vite/Vercel admin frontend.

## Existing UGO components to reuse

The current Hugo blueprint already defines:

- persistent user context
- client/provider relationships
- service memory
- interaction logs
- feature flags
- context RPCs
- provider search RPCs
- role-aware access

TEN should consume these existing capabilities instead of creating a second memory or business-logic system.

## Definition of done for first integration

The first milestone is complete when:

1. An authenticated UGO client can press a microphone button.
2. Say: "Necesito un electricista cerca de mí".
3. TEN detects the turn and transcribes it.
4. UGO resolves the intent and queries real provider data.
5. At least one structured provider result is returned.
6. TEN responds by voice.
7. The interaction is logged.
8. The whole feature can be disabled through `ten_voice_enabled`.

## Recommendation

Proceed with TEN as the UGO real-time voice engine while keeping the existing Supabase + Hugo memory + business APIs as the source of truth.

This keeps the architecture modular and allows UGO to change speech, LLM or TTS providers later without rewriting the apps or business logic.
