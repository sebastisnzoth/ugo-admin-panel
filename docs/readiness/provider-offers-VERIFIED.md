# UGO Readiness — provider-offers — VERIFIED

## Control
- READINESS_ID: `provider-offers`
- Área: App Proveedor
- Control: Recepción de ofertas
- Estado final: **VERIFIED**
- Responsable: UGO

## Qué se verificó
UGO TEST confirmó que:
- las ofertas elegibles se entregan al proveedor correcto;
- el matching respeta el radio máximo de **20 km**;
- el proveedor debe tener GPS de disponibilidad reciente y válido;
- el matching dirigido aplica las mismas garantías esenciales que el matching automático;
- categoría, deuda UGO y disponibilidad/agenda son validadas antes de generar la oferta;
- `public.obtener_ofertas_proveedor()` aísla las ofertas por `auth.uid()`;
- una identidad Cliente no puede ver las ofertas del Proveedor mediante ese RPC.

## Mejora aplicada
La prioridad visual de oportunidades quedó ordenada por:
1. urgencia;
2. menor distancia;
3. mayor valor;
4. ranking canónico del backend.

## Prueba runtime TEST
Evidencia transaccional ejecutada en **UGO Arena TEST**:
- oferta cercana: **0 km**;
- oferta visible para proveedor correcto: **1**;
- oferta visible para identidad Cliente: **0**;
- caso fuera de 20 km: rechazado;
- ofertas pendientes creadas para el caso fuera de radio: **0**.

Las mutaciones del escenario de prueba fueron revertidas al finalizar.

## Validación
- Judge: **PASS**
- Sentinel: **PASS**
- Core CI: **PASS**
- Build: **PASS**
- Contratos: **PASS**
- Lint crítico: **PASS**
- Lint completo: **PASS**
- Pages: **PASS**

## Evidencia autoritativa
- Lock: `docs/ugo-work-locks/readiness-provider-offers.json`
- Evidencia: `docs/evidence/readiness-provider-offers-20260929.json`
- Evidence ID: `provider-offers-runtime-20260929T205600Z`
- Correlation ID: `readiness-provider-offers-20260929T204500Z`
- PR de corrección: #285
- Merge SHA: `7d4fcc5b16d4b6f9ff520c2382398a6cdf2a78d3`
- Integración TEST SHA: `a9fa5f2eed407a7e6fe573172fc993158650d990`

## Regresión permanente
- Migración: `supabase/migrations/20260929205500_directed_provider_offer_radius_guard.sql`
- Contrato: `tests/contracts/provider-offers-readiness.test.mjs`
- E2E aislado actualizado para publicar GPS fresco antes del matching dirigido.

## Producción
**Producción no fue tocada.**

## Regla de cierre
El estado es autoritativo porque el lock quedó:
- `status: DONE`
- evidencia persistida;
- `Judge: PASS`;
- `Sentinel: PASS`.

No debe reabrirse este control salvo regresión futura o evidencia que invalide el cierre.
