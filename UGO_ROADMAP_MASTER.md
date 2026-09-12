# UGO — Roadmap Maestro

**Rama de verdad:** `main`  
**Principio:** los MD maestros son la fuente de verdad; Skills definen cómo trabajar; MCPs proporcionan herramientas; HUGO ejecuta, verifica y documenta.

## Objetivo de producto
Cerrar un ecosistema operativo Cliente + Proveedor + Admin/Super Admin con lifecycle único, pagos trazables, evidencia temporal correcta, ampliaciones dentro de plataforma, realtime, UX consistente y release reproducible.

## Contrato transversal vigente
`borrador → buscando → ofrecido → asignado → en_camino → llegado → en_progreso → esperando_aprobacion → completado`

Excepciones: `cancelado`, `disputado`.

- Un único `serviceId` durante todo el journey.
- `asignado → en_camino`: pago electrónico protegido/verificable o efectivo explícitamente seleccionado.
- Llegada: backend autoridad cuando aplica ubicación exacta; radio operativo vigente 200 m.
- Evidencia `Antes` en `llegado`; `Durante/Después` en `en_progreso`.
- Ampliación: descripción + costo + tiempo + aprobación + trazabilidad; delta electrónico no financiado no habilita alcance extra.
- Efectivo permanece auditable dentro de UGO.
- Ningún mecanismo de pago DEMO puede habilitar dinero/estado sobre cuentas reales: cliente y proveedor deben pertenecer explícitamente al circuito demo cuando corresponda.
- La autoría de mensajes de disputa es server/RLS-authoritative: un participante no puede autodeclararse `admin` ni usar el rol de la contraparte.

## Estado por bloques

### 1. Cliente · journey principal — avanzado
- Home / Radar / Mapa / Categorías / Búsqueda migrados al design system.
- Flujo de creación, dispatch, seguimiento, pagos, aprobación, reseñas, historial y disputas existente.
- Contrato Cliente ↔ Proveedor reforzado por `tests/contracts/client-provider-lifecycle.test.mjs`.
- Próximo cierre: ejecución real RPC/RLS/E2E con dos roles sobre entorno aislado.

### 2. Proveedor · Home / Demanda / Oportunidades — CERRADO
Implementado y verificado:
- Home operativo con disponibilidad, trabajo activo, oportunidades, demanda e ingresos.
- Oportunidades reales desde backend, detalle, aceptar/rechazar y priorización por urgencia/compatibilidad/valor/cercanía.
- Demanda real consumida desde `obtener_demanda_proveedor`, preservando `zona_lat/zona_lng` como zonas geográficas agregadas del mercado.
- Radar geográfico con MapLibre + OpenStreetMap, reutilizando la base cartográfica existente y sin posiciones visuales inventadas.
- Fallback honesto cuando una zona no publica coordenadas; estados vacío/error/Offline accionables y actualización manual disponible.
- Demanda con actualización automática mientras el proveedor está Online: fallback cada 45 s más refresh al recuperar foco/visibilidad.
- Oportunidades, servicios y pagos sincronizados por Supabase Realtime sobre tablas efectivamente publicadas.
- Aceptación de oportunidad verificada como server-authoritative y atómica mediante `aceptar_oferta`; una oferta ya tomada deja de ser aceptable sin asignaciones paralelas.
- Pre-asignación endurecida: la oportunidad se carga por `obtener_ofertas_proveedor`; el proveedor pendiente no depende de leer la fila completa de `servicios`.
- Navegación a oportunidades coherente y targets principales del journey de mercado ≥48 px.
- Contratos de regresión agregados en `tests/contracts/provider-market.test.mjs`.
- GitHub CI del bloque verde: TypeScript/build, lifecycle + provider market tests y lint crítico.
- Hugo · Asistente de Trabajo contextual integrado al servicio activo.
- Contrato de pago protegido/efectivo antes de `en_camino`.
- Evidencia Antes/Después y cierre de efectivo.

### 3. Proveedor · ejecución del servicio — EN CURSO
- `asignado → en_camino → llegado → en_progreso → esperando_aprobacion` implementado.
- Evidencia y pago efectivo integrados.
- `Agregar trabajo / Ampliar servicio` presente en trabajo en progreso.
- QA contractual Cliente ↔ Proveedor ↔ backend agregado.
- Harness ejecutable agregado en `tests/integration/client-provider-rpc-rls.test.mjs` para dos sesiones reales sobre Supabase aislado.
- El harness se niega explícitamente a ejecutar contra el project ref de producción y cubre creación, matching dirigido, privacidad pre-asignación, aceptación, gate de pago, lifecycle, evidencia, efectivo y aprobación con ownership.
- Cobertura P0 ampliada: reaceptación de oferta denegada, ampliación propuesta por proveedor, aprobación exclusiva del Cliente, doble resolución denegada, doble confirmación de efectivo denegada y doble cierre denegado.
- El harness ahora soporta `UGO_REQUIRE_ISOLATED_INTEGRATION=1`: en ese modo, credenciales ausentes hacen fallar el gate en vez de convertirse en un skip verde.
- Workflow manual obligatorio agregado en `.github/workflows/isolated-rpc-rls.yml` para ejecutar build + harness aislado con protección explícita contra producción.
- Pendiente P0 real: ejecutar ese workflow sobre un entorno aislado con credenciales de Cliente/Proveedor y ampliar webhook/reembolso y convergencia Realtime.

### 4. Admin / Super Admin — avanzado
- Configuración de sistema y credenciales.
- Medios de pago: efectivo global + Brasil/BRL + Argentina/ARS.
- Operaciones/estados, usuarios, finanzas, validación, reportes y decisiones existentes.
- Disputas: RPCs integradas para apertura, respuesta y resolución Admin; hardening versionado impide falsificar `autor_rol='admin'` en inserts directos de mensajes.
- Pendiente: auditoría final de permisos, controles operativos y journeys de excepción.

### 5. Backend / Supabase — avanzado
- Auth, PostgreSQL, RPCs, realtime y pagos en operación.
- P0 harness RPC/RLS ya preparado y conectado a CI mediante variables `UGO_TEST_*`.
- No se usa producción para pruebas destructivas.
- El CI regular conserva skip seguro cuando faltan credenciales para no convertir cada push en un falso fallo de infraestructura; el workflow `UGO Isolated RPC RLS` es el gate explícito para el cierre P0 y falla si esas credenciales no existen.
- Actualmente no existe evidencia de una ejecución exitosa del gate aislado con las seis credenciales requeridas.
- Auditoría de seguridad P0 detectó que `crear_pago_demo_sebastian` permitía a un Cliente real generar un pago ficticio si quedaba asignado a un proveedor demo. Se cerró el bypass: ahora exige ownership y `private.is_demo_account(cliente,'cliente')` además del proveedor demo.
- Migración aplicada y versionada en `supabase/migrations/20260912_guard_demo_payment_to_demo_client.sql`; regresión estática en `tests/contracts/demo-payment-guard.test.mjs`.
- Auditoría de disputas detectó que la política histórica de `disputa_mensajes` validaba participante y `autor_id`, pero no vinculaba `autor_rol` al rol real. El guard quedó versionado en `supabase/migrations/20260912214000_dispute_message_role_integrity_guard.sql` y cubierto por `tests/contracts/dispute-message-role-integrity.test.mjs`; CI #339 verde. Aplicación/verificación en producción queda pendiente mientras el conector Supabase no permita inspección segura.
- Pendiente P0: disponer/confirmar un entorno aislado seguro y las seis credenciales de test para ejecutar pruebas reales, incluida concurrencia/idempotencia.
- Pendiente posterior: continuar clasificación de security advisors sin confundir warnings de `SECURITY DEFINER` intencionales y guardados con vulnerabilidades reales.

### 6. QA / Release — EN CURSO
- GitHub CI: TypeScript, build, tests y lint crítico.
- Contratos `client-provider-lifecycle.test.mjs`, `demo-payment-guard.test.mjs`, `dispute-message-role-integrity.test.mjs` y harness `tests/integration/client-provider-rpc-rls.test.mjs` incorporados.
- CI #339 verde para el hardening de autoría de mensajes de disputa.
- El harness aislado queda en skip seguro en CI regular cuando faltan credenciales; jamás cae a producción por fallback.
- El workflow manual `UGO Isolated RPC RLS` activa `UGO_REQUIRE_ISOLATED_INTEGRATION=1`, por lo que un intento de cierre P0 sin entorno/credenciales falla de forma explícita y diagnosticable.
- Vercel producción del baseline maestro anterior quedó en `success`.
- Política de cuota/deploy definida en `DEPLOY.md`.
- Pendiente: primera ejecución verde del gate RPC/RLS aislado, E2E UI, smoke por journey y recuperación/reintentos.

## Auditoría vigente
`docs/UGO_AUDIT_20260912.md` es la baseline actual para priorizar P0/P1. La auditoría de 10/09 queda como histórica y no debe gobernar decisiones que contradigan el estado actual de `main`.

## Política de ejecución del Roadmap
HUGO toma el primer bloque `EN CURSO` con dependencia satisfecha y ejecuta:
`auditar → implementar → validar → corregir → sincronizar maestros → release controlado → siguiente bloque`.

No avanzar una pantalla sólo por estética si su contrato de datos/estado no está resuelto. No declarar bloque cerrado con CI pendiente, datos mock no autorizados o producción sin verificar cuando el alcance exige release.

## Próximo checkpoint
**P0 · Ejecutar `UGO Isolated RPC RLS` sobre un Supabase aislado y obtener la primera evidencia verde Cliente ↔ Proveedor.**

Preparación ya hecha:
1. harness versionado;
2. protección explícita contra project ref de producción;
3. variables `UGO_TEST_SUPABASE_URL`, `UGO_TEST_SUPABASE_ANON_KEY`, `UGO_TEST_CLIENT_EMAIL`, `UGO_TEST_CLIENT_PASSWORD`, `UGO_TEST_PROVIDER_EMAIL`, `UGO_TEST_PROVIDER_PASSWORD` cableadas a GitHub Actions secrets;
4. ejecución automática dentro de `npm test` cuando las seis variables existen;
5. skip seguro y visible en CI regular cuando faltan;
6. modo obligatorio `UGO_REQUIRE_ISOLATED_INTEGRATION=1` que falla ante credenciales ausentes;
7. workflow manual `.github/workflows/isolated-rpc-rls.yml` dedicado al cierre P0;
8. guards de idempotencia funcional agregados para oferta, ampliación, efectivo y cierre;
9. bypass de pago DEMO hacia clientes reales cerrado y cubierto por regresión;
10. autoría de mensajes de disputa endurecida y cubierta por regresión, pendiente de verificación/aplicación en producción por acceso Supabase.

Orden de cierre una vez disponible el entorno aislado:
1. aceptación única de oportunidad;
2. gate de pago para `asignado → en_camino`;
3. llegada + evidencia `Antes`;
4. inicio + evidencia `Después`;
5. efectivo confirmado;
6. aprobación Cliente con ownership;
7. ampliación y delta financiado;
8. retry/webhook duplicado/reembolso;
9. convergencia Realtime y reconexión.

Criterio de cierre:
- pruebas positivas y negativas reproducibles;
- ningún uso de producción como entorno de test destructivo;
- mismo `serviceId` en ambos roles;
- transiciones server-authoritative;
- idempotencia/concurrencia demostradas;
- TypeScript/build/tests/lint verdes;
- documentación sincronizada antes de avanzar al siguiente bloque.
