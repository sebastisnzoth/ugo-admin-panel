# UGO — Hugo Voice Integration Runbook

> Documento operativo de referencia para terminar la integración de Hugo por voz en UGO.
> Fuente funcional de voz: `ugo-os.zip` (Google AI Studio).
> Fuente de verdad de negocio: UGO + Supabase/RPC.
> Estado inicial de esta guía: PR #209 / rama `feat/hugo-gemini-live-ai-studio-20260926`.

## 1. Objetivo no negociable

Hugo está terminado solamente cuando este circuito funciona de punta a punta:

```
Usuario habla
→ micrófono
→ audio PCM
→ Gemini Live
→ intención / tool call
→ validación de sesión + rol + payload
→ acción REAL de UGO
→ Supabase/RPC cuando corresponda
→ actualización REAL de la UI
→ resultado de la acción
→ Hugo confirma por voz
```

Que el orbe aparezca, que el micrófono se abra o que Gemini converse NO significa que la integración esté terminada.

## 2. Regla principal: usar el ZIP, no reinventar la voz

El comportamiento de voz que funciona en `ugo-os.zip` es la referencia funcional.

Del ZIP se debe conservar/adaptar:

- sesión Gemini Live;
- captura con `getUserMedia`;
- `AudioContext`;
- entrada PCM 16 kHz;
- recepción/reproducción PCM 24 kHz;
- conversación continua;
- interrupción/barge-in;
- estados de sesión y audio;
- tool calls;
- cierre y cleanup de tracks/contextos;
- experiencia del orbe `HugoSphere`.

No reconstruir estos comportamientos desde cero si el ZIP ya los resuelve correctamente.

## 3. Qué NO portar del ZIP

El ZIP es referencia de voz, no fuente de verdad del negocio.

No portar a producción:

- Firebase/Firestore del prototipo;
- datos demo;
- proveedores inventados;
- disponibilidad inventada;
- `Math.random()` usado como dato operativo;
- respuestas que simulen una acción exitosa;
- lógica de negocio paralela a UGO.

Todo dato operativo debe venir de UGO real.

## 4. Arquitectura objetivo

Debe existir un solo motor compartido de Hugo.

Responsabilidades separadas:

- **Hugo Live/Audio:** micrófono, PCM, Gemini Live, playback, interrupción y lifecycle.
- **Hugo Action Router:** recibe tool calls estructuradas.
- **Hugo Permissions:** valida rol y allowlist.
- **UGO adapters:** llaman exactamente las mismas operaciones reales que utiliza la UI.
- **Hugo UI/Sphere:** representa idle/connecting/listening/thinking/speaking/error.

No mantener dos motores de voz compitiendo.

## 5. Seguridad

Nunca exponer una `GEMINI_API_KEY` permanente en frontend, bundle, localStorage o APK.

Usar el límite backend/token efímero existente o equivalente seguro.

Gemini nunca puede:

- ejecutar SQL arbitrario;
- elegir RPC arbitrarias;
- saltar RLS;
- elevar privilegios;
- decidir su propio rol;
- confirmar una acción que el backend rechazó.

Orden obligatorio antes de ejecutar:

```
validateSession()
validateRole()
validateAction()
validatePayload()
executeRealUgoAction()
```

El rol proviene de la identidad real de UGO/Supabase, no de Gemini.

## 6. Roles y allowlists

### Cliente

Acciones objetivo, sólo cuando tengan implementación real:

- buscar/seleccionar servicio o categoría;
- usar ubicación actual;
- definir ubicación;
- crear pedido;
- consultar pedido activo;
- cancelar cuando las reglas lo permitan;
- aprobar trabajo;
- seleccionar/confirmar pago;
- calificar;
- abrir historial/perfil/mapa.

### Proveedor

- listar ofertas reales;
- aceptar/rechazar;
- iniciar navegación;
- publicar ubicación real;
- confirmar llegada;
- evidencia inicial/final;
- comenzar/finalizar trabajo;
- consultar trabajos/deuda;
- pagar UGO;
- calificar cliente.

La voz NO puede evitar GPS reciente, rechazo de 0,0, geofence, evidencia ni lifecycle.

### Admin

Sólo operaciones administrativas explícitamente autorizadas y auditables. Hugo Admin no es una puerta trasera.

Si una capacidad no existe realmente, responder `capability_not_available`. Nunca fingir éxito.

## 7. Vertical slice obligatorio — Cliente primero

Antes de ampliar el alcance, cerrar este recorrido:

### “Necesito un plomero”

Hugo debe:

1. escuchar;
2. entender la intención;
3. identificar/seleccionar la categoría real;
4. accionar UGO real;
5. reflejarlo en la UI;
6. no crear profesionales falsos;
7. no inventar disponibilidad;
8. responder por voz con el resultado real.

### “Usá mi ubicación”

Debe llamar el flujo GPS real existente de UGO. No duplicar geolocalización con una implementación paralela.

### “Confirmar pedido”

Debe usar la misma lógica real que usa la interfaz para crear el pedido. Si falla, Hugo debe comunicar el fallo real y no afirmar que fue creado.

**No avanzar a decenas de acciones hasta que este slice funcione de punta a punta.**

## 8. Segundo slice — Proveedor

Validar por voz:

```
“Mostrame mis ofertas”
→ ofertas reales

“Aceptá este trabajo”
→ aceptación real

“Voy para allá”
→ transición real

“Ya llegué”
→ GPS real
→ geofence real
→ RPC/lifecycle real
```

No crear caminos especiales para voz que eludan las reglas P0.

## 9. Tercer slice — Admin

Validar consultas y navegación reales con acciones autorizadas.

Mantener:

- auth;
- rol;
- RLS;
- RPC;
- auditoría;
- validaciones.

## 10. Idiomas

Hugo usa el idioma activo de UGO:

- `es-AR`: español rioplatense;
- `pt-BR`: português brasileiro.

Traducir conversación/UI, no códigos internos de negocio ni valores persistidos.

## 11. Fallback

Si Gemini Live o el micrófono fallan, Cliente/Proveedor/Admin deben seguir operables manualmente.

Hugo es una interfaz adicional; una caída de voz no puede bloquear el producto.

## 12. Checklist de implementación

- [x] Rama dedicada para integración.
- [x] PR #209 abierto.
- [x] Contrato compartido inicial de roles/locale.
- [x] Allowlist inicial por rol.
- [x] Rechazo de acción fuera del rol.
- [x] Token efímero/backend en lugar de API key permanente en frontend.
- [ ] Consolidar el motor del ZIP como referencia efectiva de voz sin duplicar motores.
- [ ] Cliente: “Necesito un plomero” modifica UGO real.
- [ ] Cliente: “Usá mi ubicación” usa GPS real.
- [ ] Cliente: “Confirmar pedido” crea pedido real.
- [ ] Hugo confirma por voz el resultado real de cada tool call.
- [ ] Proveedor: ofertas reales.
- [ ] Proveedor: aceptar/rechazar real.
- [ ] Proveedor: navegación/ubicación real.
- [ ] Proveedor: “Ya llegué” respeta geofence/lifecycle.
- [ ] Admin: consultas/acciones permitidas reales.
- [ ] Un solo orbe/motor compartido.
- [ ] ES/PT-BR verificados.
- [ ] Fallback manual verificado.
- [ ] Tests de permisos/payload/acción desconocida/sesión.
- [ ] TypeScript verde.
- [ ] Lint verde.
- [ ] Tests verdes.
- [ ] Build verde.
- [ ] Validación manual real completada.
- [ ] Revisión final de secretos/mock/demo.
- [ ] Reconciliar con `main` sin reset/force push.
- [ ] Merge sólo después de validación.
- [ ] Deploy únicamente después de validar y autorizarlo.

## 13. Reglas para cualquier agente que continúe este trabajo

Antes de cada bloque:

```bash
git fetch origin main
git status
git rev-parse HEAD
git rev-parse origin/main
git log --oneline -10 origin/main
```

Si `main` avanzó, reconciliar de forma segura.

Prohibido:

- reset destructivo;
- force push;
- revertir trabajo ajeno;
- borrar cambios concurrentes;
- debilitar RLS;
- cambios destructivos en Supabase;
- deploy para “probar” antes de validar;
- reemplazar voz funcional del ZIP por otra implementación sin una razón verificada;
- declarar éxito con mocks.

## 14. Definición de DONE

La integración sólo puede marcarse **DONE** cuando se demuestra:

```
YO HABLO CON HUGO
→ HUGO ME ENTIENDE
→ HUGO EJECUTA UNA ACCIÓN REAL DE UGO
→ LA UI CAMBIA
→ SUPABASE REFLEJA EL CAMBIO CUANDO CORRESPONDE
→ HUGO CONFIRMA EL RESULTADO POR VOZ
```

Debe cumplirse manteniendo seguridad, roles, RLS, GPS, lifecycle, ES/PT-BR y fallback manual.

## 15. Principio final

**Voz:** copiar/adaptar lo que ya funciona en `ugo-os.zip`.

**Negocio:** reutilizar lo que ya funciona en UGO.

**Nunca:** sustituir una de esas dos fuentes por simulaciones.
