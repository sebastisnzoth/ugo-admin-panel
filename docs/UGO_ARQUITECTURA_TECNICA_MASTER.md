# UGO — Arquitectura Técnica Master

**Versión:** 2.2 · 16 de septiembre de 2026  
**Estado:** contrato técnico vivo  
**Repositorio:** `sebastisnzoth/ugo-admin-panel`  
**Rama única:** `main`

## 1. Principios

1. `main` es la fuente integrada.
2. `serviceId` es identidad transversal.
3. Cliente, Proveedor y Admin observan el mismo servicio persistido.
4. Estado del servicio y estado operacional del proveedor son máquinas distintas.
5. Backend/RLS/RPC gobiernan transiciones críticas.
6. Realtime sincroniza persistencia.
7. Pagos son method-aware.
8. UI/design no inventa dominio.
9. Un cliente puede tener múltiples pedidos independientes.
10. Observabilidad no puede mutar dominio ni readiness.
11. Publicación es una capa separada de integración.

## 2. Stack canónico

Frontend:

```text
React 19
TypeScript
Vite
CSS / Design System UGO
```

Backend/datos:

```text
Supabase JS 2
PostgreSQL
Auth
RLS
RPC
Realtime
Storage privado
```

Mapas:

```text
MapLibre GL
OpenStreetMap
Haversine por defecto / OSRM opcional
```

Serverless API publicada: `/api` en el runtime web configurado. El frontend no debe asumir que el bundle web publicado coincide con el HEAD de `main`.

## 3. Superficies

`src/mvp/MvpApp.tsx` resuelve:

```text
?app=client      → Cliente
?app=provider    → Proveedor
?app=admin       → Admin/Super Admin gate
?app=development → Desarrollo público read-only
?app=web         → Web
sin app          → Landing
```

`?app=development` es una excepción deliberada sin `AdminGate`; no concede privilegios administrativos.

## 4. Desarrollo público

Arquitectura:

```text
tablas readiness privadas/protegidas
→ vistas públicas sanitizadas
→ DevelopmentDashboard read-only
```

El feed público no expone evidencia completa, actor de cambio, `serviceId`, stack, metadata privada ni reporter IDs.

Una señal realtime no sensible sólo invalida/refresca la vista; no permite mutación.

## 5. Centinela

Flujo:

```text
runtime TEST
→ reportSentinelIncident
→ redacción/sanitización
→ contexto build/rol/acción
→ clasificación server-side de acciones conocidas
→ persistencia privada
→ vista pública sanitizada
```

Fallback anónimo:

```text
fallo seguro sin cliente autenticado
→ cola local limitada y sanitizada
→ flush posterior cuando exista cliente autorizado
```

Centinela no modifica `development_checklist`.

`runtimeRevision` permite separar incidente actual de histórico. Un reporte de un APK/build viejo no debe atribuirse al HEAD actual.

## 6. Cliente ↔ Proveedor

```text
Cliente crea solicitud
→ backend persiste serviceId
→ matching produce oportunidad
→ Proveedor acepta atómicamente
→ Cliente observa asignación
→ pago habilita ejecución
→ lifecycle
→ aprobación/disputa
```

Chat, tracking, pago, evidencia y cancelación reciben/derivan el `serviceId` exacto; nunca mutan “el último servicio”.

## 7. Lifecycle

Servicio:

```text
borrador → buscando → ofrecido → asignado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones: `cancelado`, `disputado`.

Proveedor:

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

## 8. Multi-pedido

La arquitectura permite A+B+C pedidos independientes para un mismo cliente. `request_draft_id` puede proteger reintentos del mismo draft, pero no convertirse en single-active guard.

Prohibido usar como autoridad de mutación:

```text
activeServiceId global
latest active service
.limit(1) para cancelar/editar un pedido ambiguo
```

## 9. Pagos

```text
intención UI
→ API/RPC server-side
→ procesador/adaptador
→ referencia externa
→ webhook/conciliación
→ persistencia UGO
```

Efectivo registra selección/recepción; no se presenta como dinero protegido electrónicamente.

Credencial guardada ≠ runtime configurado ≠ feature habilitada ≠ E2E validado.

## 10. Backend boundaries

Frontend puede solicitar mutaciones y feedback reversible. Backend valida identidad, rol, participación, estado previo, concurrencia, dinero, evidencia y transición atómica.

## 11. Realtime

```text
canal filtrado por entidad/serviceId
cleanup
reconexión
refetch
sin duplicados
convergencia a persistencia
```

## 12. Storage/evidencia

```text
UI
→ validación básica
→ bucket privado
→ objeto real
→ metadata ligada a draft/serviceId
→ policy/RLS
→ acceso autorizado
```

Metadata/path sin objeto no es evidencia válida.

## 13. Android TEST

El APK QA canónico puede empaquetar la UI del `dist` del SHA dentro de Capacitor. No debe cargar una UI remota mediante `server.url`.

Contrato:

```text
UI = bundle local del build
/api = backend publicado configurado por VITE_API_BASE_URL
transport = CapacitorHttp cuando aplica
```

Por eso se deben registrar por separado revisión del bundle y backend API utilizado.

## 14. Observabilidad

Toda vertical crítica debe responder:

```text
qué falló
rol
acción
build
serviceId privado cuando aplica
estado esperado
retry/recuperación
resultado
```

La vista pública muestra sólo la parte segura de esa información.

## 15. Madurez técnica

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

Arquitectura no considera “Done” una integración porque haya código o variable configurada.

## 16. Legacy

Legacy sólo puede coexistir durante migración; no recibe nuevas reglas ni debe crear una segunda salida operacional.

## 17. Cost discipline

Preferir serverless/managed y evitar infraestructura innecesaria; nunca ahorrar rompiendo seguridad o integridad.

## 18. Regla final

**Toda nueva pieza se integra al circuito existente. Desarrollo público observa sin privilegios; Centinela detecta sin gobernar; `main` integra sin implicar publicación; el `serviceId` mantiene unida la operación.**

## 19. Hugo Voice · Gemini Live

Cliente y Proveedor comparten una capa de voz persistente inspirada en el patrón probado de `gods-eye-view`, pero el dominio UGO sigue siendo la autoridad de acciones, estado, dinero y permisos.

Contrato de entrada:

```text
sesión UGO autenticada
→ POST /api/test { voice_live_token: true, voice_live_mode: "transcribe" }
→ backend valida Auth/rol y emite token efímero de un uso
→ navegador abre WebSocket Gemini Live directo
→ micrófono PCM16 mono 16 kHz en chunks ~100 ms
→ interimInputTranscription actualiza texto visible
→ inputTranscription final entra al mismo handleText que el teclado
→ dominio UGO ejecuta la acción real
```

Contrato de salida hablada de baja latencia para Cliente/Proveedor:

```text
respuesta ya resuelta por UGO
→ sesión Gemini Live speaker persistente (voice_live_mode: "speaker")
→ clientContent con el texto exacto a leer
→ audio PCM incremental Gemini Live
→ reproducción Web Audio en cola sin esperar un archivo TTS completo
→ reanudar transcripción sobre la misma sesión de entrada
```

Seguridad y continuidad:

- `GEMINI_API_KEY` permanece sólo server-side;
- cada WebSocket recibe un token efímero de un uso; el request de `auth_tokens` evita campos de constraints rechazados por producción y el modelo/configuración se envían en el primer frame `setup`;
- la sesión de entrada usa por defecto `gemini-3.5-transcribe-live` con salida TEXT; la sesión speaker usa `GEMINI_LIVE_VOICE_MODEL` / `GEMINI_LIVE_MODEL` o `gemini-3.8-live` con salida AUDIO;
- el speaker sólo vocaliza texto ya decidido por la aplicación: no puede crear servicios, cambiar pagos, elegir disponibilidad ni saltar RPC/RLS;
- durante la respuesta hablada, `pauseListening/resumeListening` conserva la sesión de transcripción y evita que Hugo se escuche a sí mismo;
- si el speaker Live falla, Cliente/Proveedor conservan fallback al TTS HTTP existente y luego a `speechSynthesis` del dispositivo;
- ante cierre inesperado de la sesión de entrada se solicita un token nuevo y se reconecta con backoff;
- voz, teclado y botones siguen entrando al mismo flujo canónico.

Madurez: implementación integrada sujeta a CI. `RUNTIME VALIDATED` exige smoke real en navegador/dispositivo con micrófono, ES/PT, primera respuesta, turnos sucesivos, interrupción/reanudación y recorrido Cliente/Proveedor.

---

## Hugo Admin Voice Command Bus · 21/09/2026

La capa de voz de navegador es compartida entre Cliente, Proveedor y Admin. `browserVoiceBridge.ts` obtiene un token efímero server-side y transmite PCM 16 kHz por Gemini Live para transcripción incremental. Para Admin usa la sesión administrativa global y el backend valida que el usuario activo tenga rol `admin` o `superadmin`.

El Control Center conserva separación estricta entre **comprender** y **ejecutar**:

```text
Gemini Live (voz)
→ transcripción
→ /api/hugo/chat + contexto Admin autorizado
→ JSON { reply, ui_action }
→ allowlist cliente
→ event bus ugo:admin:hugo-action
→ AdminPhase2
→ navegación / apertura serviceId / refresh / comando mapa
```

El mapa recibe `ugo:admin:map-command` y aplica filtros de estado, categoría, zona, radio, localidad y visibilidad de actores.

No existe ejecución arbitraria de SQL ni mutación libre desde el modelo. Dinero, permisos, KYC, disputas, usuarios y configuración sensible continúan detrás de RPC/RLS y confirmaciones auditadas de los módulos correspondientes. Gemini TTS se usa para la respuesta hablada con fallback local cuando el servicio de audio no está disponible.
## Scout · Gmail de reclutamiento (2026-09-22)

Scout usa OAuth 2.0 server-side para conectar una cuenta Gmail operativa del panel Admin. El navegador nunca recibe client secret ni refresh token. La conexión se persiste en `public.scout_gmail_conexiones` con acceso exclusivo `service_role`; `/api/scout/gmail` valida rol Admin/Super Admin, renueva access tokens y envía por Gmail API con el scope mínimo `gmail.send`.

El flujo canónico es: Scout/CRM → API autenticada → conexión Gmail server-only → Gmail API → auditoría `scout_email_envios` → actualización del prospecto (canal, intentos, último contacto y seguimiento). El envío directo reemplaza `mailto:` como canal principal; el borrador BCC queda sólo como respaldo manual.

