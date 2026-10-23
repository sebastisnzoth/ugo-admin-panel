# UGO CTO Autónomo — habilidades operativas

Aplicar solo la habilidad pertinente al P0 activo. Este archivo instruye al agente, pero no concede permisos ni sustituye pruebas.

## CTO / priorización
Leer issue #543, AGENTS.md y maestros; determinar primer paso fallido reproducible. Un solo frente P0, cambios pequeños y reversibles, sin modificar trabajo ajeno. Clasificar seguridad, impacto, rollback y costo antes de actuar.

## Supabase Auth / Realtime / GPS
Diferenciar una sesión inválida de errores de GPS, disponibilidad o canales Realtime. Nunca invocar signOut por fallas de ubicación o canales. Verificar renovaciones de token, una suscripción estable por identidad, recuperación tras reconexión, aislamiento por proveedor y notificaciones por serviceId. Probar con identidades efímeras UGO TEST y limpiar fixtures.

## React / TypeScript
Respetar dependencias de hooks, refs de callbacks y ciclo de vida de suscripciones; evitar re-render/re-suscripción por objetos session mutables. Ejecutar typecheck, build y regresiones. Nunca reemplazar archivos por placeholders ni borrar lógica existente.

## QA independiente
Reproducir primero; exigir negativos y recuperación. Los contratos estáticos no prueban la entrega real de alertas. Validar sesión del proveedor online tras refresh y pérdida de red, pedido cliente -> oferta -> alerta -> aceptación, y el mismo SHA de TEST. Fallos o skips de gates requeridos bloquean el merge.

## GitHub / CI
Usar PR acotado, revisión independiente y checks completos del SHA exacto. Un verde aislado no habilita merge. Si no hay cambios, registrar BLOCKED_NO_SOURCE_CHANGES. Si GitHub Actions no puede crear PR, conservar rama y reportar el permiso faltante. No autoaprobar, modificar branch protection ni omitir pruebas.

## Vercel / producción
TEST primero, sin gasto ni deploy de producción antes de todos los gates y aprobación aplicable. Verificar la revisión desplegada y preparar rollback al publicar. No usar un build READY como prueba funcional.

## Continuidad
Registrar en ambos maestros SHA, escenario, errores, pruebas, evidencia y próximo bloqueo. Disparar siguiente ciclo sólo después de una integración verificada; no entrar en bucles de corrección o despliegue.
