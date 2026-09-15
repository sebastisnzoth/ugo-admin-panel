# Bugs RC1

## BUG-001

- ID: BUG-001
- Módulo: Cliente · Pagos
- Severidad: CRÍTICA
- Descripción: `DemoSebastianPaymentBridge` se monta siempre en `ClientRoot` y reemplaza globalmente `window.fetch`. Todas las solicitudes POST a `/api/pagos/crear` intentan ejecutar primero el RPC demo; ante errores distintos de `NO_ES_DEMO_SEBASTIAN` devuelve HTTP 409 y puede bloquear pagos reales de clientes que no pertenecen al flujo demo.
- Archivo probable: `src/mvp/DemoSebastianPaymentBridge.tsx`, `src/mvp/MvpApp.tsx`
- Estado: FIXED

## BUG-002

- ID: BUG-002
- Módulo: Cliente / Proveedor · Recuperación de acceso
- Severidad: MEDIA
- Descripción: `AuthScreen` genera enlaces de recuperación con `?app=client` o `?app=provider`, pero sólo `AdminGate` procesa `code` mediante `exchangeCodeForSession`. Cliente y Proveedor no intercambian el código PKCE, por lo que el enlace puede abrir la aplicación sin sesión recuperada ni formulario para definir la nueva contraseña.
- Archivo probable: `src/mvp/shared.tsx`, `src/mvp/MvpApp.tsx`, `src/mvp/ClientOnboardingGate.tsx`, `src/mvp/ProviderOnboardingGate.tsx`
- Estado: FIXED

## BUG-003

- ID: BUG-003
- Módulo: Cliente · PIX
- Severidad: MEDIA
- Descripción: La carga del pago usa `maybeSingle()` con `limit(1)` y sin `order`. Cuando existen varios registros para el mismo servicio, Supabase puede devolver un pago arbitrario o generar un resultado ambiguo; la interfaz puede mostrar un estado PIX desactualizado.
- Archivo probable: `src/mvp/ClientPixPaymentPanel.tsx`
- Estado: FIXED

## BUG-004

- ID: BUG-004
- Módulo: Provider · Realtime operativo
- Severidad: MEDIA
- Descripción: Los callbacks de Realtime invocan `loadData()` sin `await` ni `catch`. Una caída de Supabase o una respuesta con error produce promesas rechazadas sin feedback visible y deja el radar, solicitudes o pagos desactualizados.
- Archivo probable: `src/mvp/ProviderApp.tsx`
- Estado: FIXED

## BUG-005

- ID: BUG-005
- Módulo: Cliente / Provider · Historial
- Severidad: MENOR
- Descripción: El canal Realtime de `ServiceHistoryPanel` escucha todos los cambios de `servicios` y vuelve a consultar el historial completo para cada evento. En una cuenta con actividad concurrente provoca consultas y renders innecesarios, especialmente en móvil o conexiones lentas.
- Archivo probable: `src/mvp/ServiceHistoryPanel.tsx`
- Estado: FIXED

## BUG-006

- ID: BUG-006
- Módulo: Cliente · Inicialización offline
- Severidad: MENOR
- Descripción: El estado offline se evalúa dentro de un `useEffect` y muestra el aviso sólo después del primer render. En una carga sin conexión el usuario puede ver brevemente una pantalla sin contexto antes de que aparezca el estado offline, y la carga inicial de Supabase falla sin un estado de error específico.
- Archivo probable: `src/mvp/ClientApp.tsx`
- Estado: FIXED

## BUG-007

- ID: BUG-007
- Módulo: Provider · Herramientas operativas
- Severidad: MEDIA
- Descripción: Cuando `ProviderApp` está en la pestaña Radar retorna directamente `ProviderHomeStructural`, dejando fuera `VoiceHugoDock`, `ProviderEvidencePanel` y `ProviderCompletionReceipt`, que sólo se montan en el retorno alternativo. Con un servicio activo desde Radar, el proveedor no tiene acceso directo a Hugo, evidencias ni comprobante de cobro.
- Archivo probable: `src/mvp/ProviderApp.tsx`, `src/mvp/ProviderHomeStructural.tsx`
- Estado: FIXED

## BUG-008

- ID: BUG-008
- Módulo: Cliente · Actividad / pedido activo
- Severidad: CRÍTICA · P0
- Descripción: En una prueba real con el Servicio #31 en `en_camino`, Cliente → Actividad → Abrir pedido termina en el fallback global “No pudimos cargar esta pantalla”, impidiendo entrar al detalle y al chat del pedido activo.
- Evidencia: `serviceId=fef86faf-dd4d-427c-9147-d5975d5c0c60`, número 31. El servicio existe y permanece `en_camino` en UGO TEST.
- Corrección implementada: contexto de Sentinela por `serviceId`, boundary local del detalle, aislamiento de módulos secundarios y registro P0 automático en `CLIENT-ORDER-OPEN`.
- Archivos: `src/mvp/client/ClientRoot.tsx`, `src/mvp/client/ClientServiceDetail.tsx`, `src/mvp/SentinelErrorBoundary.tsx`, `src/lib/sentinel.ts`
- Estado: IMPLEMENTED · PENDING REAL-DEVICE VALIDATION

## BUG-009

- ID: BUG-009
- Módulo: Chat Cliente ↔ Proveedor
- Severidad: CRÍTICA · P0
- Descripción: El proveedor envió un mensaje para el Servicio #31 y el cliente no lo recibió en interfaz. La base sí persistió el mensaje (`mensajes.id=8`, rol `proveedor`) y la política RLS permite que el cliente participante lo lea; el fallo queda acotado a sincronización/render de cliente, no a pérdida del mensaje.
- Corrección implementada: monitoreo Sentinela de carga/envío/canal Realtime, resincronización de respaldo cada 10 s cuando la app está visible y chat aislado por `serviceId` dentro del detalle del pedido.
- Archivos: `src/mvp/ServiceChat.tsx`, `src/mvp/client/ClientServiceDetail.tsx`, `src/lib/sentinel.ts`
- Estado: IMPLEMENTED · PENDING TWO-SESSION VALIDATION

## BUG-010

- ID: BUG-010
- Módulo: Cliente · Actividad UX
- Severidad: ALTA · P1
- Descripción: La pantalla Actividad no comunica con suficiente claridad qué pedido está activo, próximo o finalizado ni prioriza el estado operativo del servicio. El problema fue confirmado durante la misma prueba del Servicio #31.
- Checklist: `CLIENT-ACTIVITY-UX`.
- Estado: OPEN · UX REDESIGN PENDING

## QA-OBS-001 · Sentinela

- Se agregó `development_incidents` como stream Realtime de incidentes de UGO TEST.
- Errores globales, `unhandledrejection`, fallos de render, apertura de pedido y chat pueden registrar rol, ruta, acción, `serviceId`, severidad y código de checklist.
- Incidentes P0/P1 mapeados pueden mover automáticamente el ítem correspondiente del checklist a `failed` y dejar evidencia auditable.
- El panel `Desarrollo` muestra el contador y los últimos incidentes del Sentinela en tiempo real.
