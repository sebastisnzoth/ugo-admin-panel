# Inventario inicial de acoplamientos DOM — UGO Cliente

Este inventario fue tomado antes del refactor de Fase 0. No cambia contratos de Supabase, matching ni pagos.

| Archivo | Acoplamiento | Área afectada | Tratamiento Fase 0 |
| --- | --- | --- | --- |
| `ClientGlobalMenu.tsx` | `querySelector(...).click()` y eventos `ugo:*` | menú, historial, disputa, ubicación, Hugo | reemplazar por `ClientFlow` y acciones tipadas |
| `ClientQuantumExperience.tsx` | eventos `ugo:hugo-*` y `ugo:open-hugo` | búsqueda, proveedor, Hugo | reemplazar por intent/callbacks tipados |
| `ClientQuickOrder.tsx` | listeners `ugo:hugo-*` | solicitud desde Hugo | consumir intención tipada del flow |
| `useHugoVoice.ts` | selectores de tarjetas/botones y clicks programáticos | Hugo, contratación, solicitud, pago, cancelación, aprobación, disputa | invocar `ClientActionHandlers` |
| `VoiceHugoDock.tsx` | eventos de Hugo | Hugo y solicitud | pasar callbacks explícitos |
| `DisputeDock.tsx` | listener `ugo:open-dispute` | disputa | recibir solicitud controlada |
| `ClientCompletionReview.tsx` | `dispatchEvent` para disputa | revisión | callback explícito |
| `ClientQuantumExperience.tsx` | DOM imperativo de MapLibre | mapa | conservar: es API del mapa, no navegación React |
| `useHugoVoice.ts` | listeners del bridge `UGOVoiceBridge` | voz nativa | conservar: es contrato del bridge Android |

## Riesgos documentados

- `ClientCompletionReview` consulta el último servicio en `esperando_aprobacion` sin filtro explícito de `cliente_id`; la separación depende de RLS. No se altera en esta fase.
- `DemoSebastianPaymentBridge` reemplaza `window.fetch` mientras está montado. Solo intercepta `POST /api/pagos/crear`, intenta `crear_pago_demo_sebastian` cuando existe `servicioId`, y restaura el `fetch` original al desmontar. Puede afectar toda llamada coincidente realizada mientras el bridge está montado; no se modifica en esta fase.
- Uso de Supabase pendiente de unificación: `ClientApp`, onboarding, review, evidencia y mapa usan `roleSupabase('client')`; `ClientPixPaymentPanel` y `ClientQuickOrder` usan el cliente legado `supabase`. No se cambian sesiones sin una prueba dedicada.

## Matriz de clientes Supabase

| Archivo | Cliente | Operación | Motivo actual |
| --- | --- | --- | --- |
| `ClientApp.tsx` | `roleSupabase('client')` | sesión, perfil, servicios, ofertas, pagos, reseñas, RPC | flujo autenticado Cliente |
| `ClientOnboardingGate.tsx` | `roleSupabase('client')` | usuario, perfil y `completar_onboarding_cliente` | aislamiento de sesión por rol |
| `ClientCompletionReview.tsx` | `roleSupabase('client')` | servicio/evidencia y `aprobar_servicio` | revisión autenticada; consulta depende de RLS por no filtrar `cliente_id` |
| `ClientEvidenceGallery.tsx` | `roleSupabase('client')` | evidencias y URLs firmadas | acceso del cliente al servicio propio |
| `ClientQuantumExperience.tsx` | prop `roleSupabase('client')` | `proveedores_mapa` | radar del cliente |
| `ClientPixPaymentPanel.tsx` | `supabase` legado | pagos y `crear_pix_demo` | riesgo: storage key distinta de Cliente |
| `ClientQuickOrder.tsx` | `supabase` legado | categorías, perfil, mapa y creación de servicio | riesgo: storage key distinta de Cliente |
| `ServiceHistoryPanel.tsx` | `roleSupabase('client')` | historial de servicios | aislamiento de sesión por rol |
| `DisputeDock.tsx` | hook con `roleSupabase('client')` | disputa y mensajes | acceso participante por RLS |
