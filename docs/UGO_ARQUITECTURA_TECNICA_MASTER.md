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

La voz del Cliente/Proveedor usa una sesión de transcripción **Gemini Live persistente**, no el ciclo `grabar archivo → subir → transcribir → volver a grabar`.

Contrato:

```text
sesión UGO autenticada
→ POST /api/test { voice_live_token: true }
→ backend valida Auth/rol y emite token efímero restringido
→ navegador abre WebSocket Gemini Live directo
→ micrófono PCM16 mono 16 kHz en chunks ~100 ms
→ interimInputTranscription actualiza texto visible
→ inputTranscription final entra al mismo handleText que el teclado
→ dominio UGO ejecuta la acción real
```

Seguridad y continuidad:

- `GEMINI_API_KEY` permanece sólo server-side;
- el navegador recibe únicamente un token efímero de un uso, corto y restringido a `gemini-3.5-transcribe-live` + salida TEXT;
- `responseModalities` del WebSocket vive dentro de `setup.generationConfig`; el token usa `liveConnectConstraints` en la raíz del request de `auth_tokens`;
- durante TTS, `pauseListening/resumeListening` conserva el WebSocket y el micrófono para no renegociar una sesión por turno;
- ante cierre inesperado se solicita un token nuevo y se reconecta con backoff; si Live no inicia, la UI conserva fallback de reconocimiento del dispositivo/texto;
- voz, teclado y botones siguen entrando al mismo flujo canónico; Gemini transcribe/interpreta, pero no se convierte en autoridad de servicio, dinero, disponibilidad ni permisos.

Madurez de esta pieza: código integrado y sujeto a CI; la promoción a `RUNTIME VALIDATED` exige smoke real con micrófono, permiso, ES/PT, interrupción/reanudación y recorrido Home → pedido.
