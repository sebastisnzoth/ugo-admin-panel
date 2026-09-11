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
- Estado: OPEN

## BUG-005

- ID: BUG-005
- Módulo: Cliente / Provider · Historial
- Severidad: MENOR
- Descripción: El canal Realtime de `ServiceHistoryPanel` escucha todos los cambios de `servicios` y vuelve a consultar el historial completo para cada evento. En una cuenta con actividad concurrente provoca consultas y renders innecesarios, especialmente en móvil o conexiones lentas.
- Archivo probable: `src/mvp/ServiceHistoryPanel.tsx`
- Estado: OPEN

## BUG-006

- ID: BUG-006
- Módulo: Cliente · Inicialización offline
- Severidad: MENOR
- Descripción: El estado offline se evalúa dentro de un `useEffect` y muestra el aviso sólo después del primer render. En una carga sin conexión el usuario puede ver brevemente una pantalla sin contexto antes de que aparezca el estado offline, y la carga inicial de Supabase falla sin un estado de error específico.
- Archivo probable: `src/mvp/ClientApp.tsx`
- Estado: OPEN

## BUG-007

- ID: BUG-007
- Módulo: Provider · Herramientas operativas
- Severidad: MEDIA
- Descripción: Cuando `ProviderApp` está en la pestaña Radar retorna directamente `ProviderHomeStructural`, dejando fuera `VoiceHugoDock`, `ProviderEvidencePanel` y `ProviderCompletionReceipt`, que sólo se montan en el retorno alternativo. Con un servicio activo desde Radar, el proveedor no tiene acceso directo a Hugo, evidencias ni comprobante de cobro.
- Archivo probable: `src/mvp/ProviderApp.tsx`, `src/mvp/ProviderHomeStructural.tsx`
- Estado: OPEN
