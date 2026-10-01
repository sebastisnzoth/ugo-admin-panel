# UGO — Hugo Runtime / Evidencia de voz
Fecha: 2026-10-01
Repositorio: sebastisnzoth/ugo-admin-panel

## Objetivo
Documentar el estado real de Hugo por voz en Cliente y Proveedor, las correcciones aplicadas, la evidencia disponible y los puntos todavía no verificados. Este documento no autoriza producción ni reemplaza evidencia runtime real.

## Estado funcional observado por Sergio
### Cliente
- El pedido por voz funcionó al menos una vez con categoría Electricista.
- Después de crear un primer pedido por voz, un segundo intento perdió continuidad.
- El flujo por voz no guiaba al cliente a sacar una foto del problema.
- La selección de forma de pago aparecía, pero al tocar Efectivo o Pix no había reacción visible inmediata.
- Las notificaciones no estaban sincronizadas en tiempo real y aparecían de forma desordenada.
- La calificación existe, pero aparece dentro del pedido y no queda presentada de forma clara en la pantalla principal al terminar.

### Proveedor
- Las ofertas no aparecían en tiempo real al proveedor cercano.
- No había sonido de nueva oferta.
- Al asignar manualmente un pedido, el proveedor podía quedar bloqueado esperando la forma de pago.
- El proveedor no podía avanzar a “Estoy en camino” cuando el flujo de pago quedaba trabado.
- Hugo por voz en Proveedor no respondía y podía quedar cargando/escuchando indefinidamente.
- “Mis trabajos” y el historial podían mostrar estados de forma confusa o desordenada.
- La interfaz del proveedor necesita simplificación para uso operativo real.

## Correcciones integradas en main
Merge principal:
- PR #359
- Merge SHA: 5044120dabdbcf1aba8e88525619c6894a3afad3

Incluyó:
1. Realtime Proveedor
   - Reconstrucción del canal realtime al volver la app al frente.
   - Resync autoritativo al recuperar conexión/visibilidad.

2. Ofertas y alertas
   - Inserción realtime de nuevas ofertas reflejada de inmediato en estado local.
   - Alerta del proveedor disparada inmediatamente para ofertas no ligadas a un estado persistido.
   - Avisos de lifecycle siguen validándose contra persistencia antes de sonar.

3. Pago Cliente
   - Feedback inmediato al seleccionar Efectivo o Pix.
   - Si la persistencia falla de forma confirmada, se revierte la selección.
   - Se conserva el guard fail-closed del proveedor.

4. Hugo Proveedor
   - Timeout de 9 segundos para impedir que el orbe quede colgado indefinidamente.
   - Mensaje de error accionable cuando no logra conectar.

5. Hugo Cliente
   - Timeout de conexión equivalente.
   - Guía explícita para sacar foto del problema antes de continuar el pedido.

6. Contratos
   - Tests de regresión agregados para los bloqueos anteriores.

## Estado de Gemini Live / Hugo Runtime
Proyecto TEST:
- Supabase: UGO Arena
- Project ref: tmossnqfwfwjrtzwcbmm
- Edge Function: hugo-runtime
- Runtime desplegado en TEST: versión 3
- Producción: no modificada

Cambios de hardening aplicados en TEST:
- Token efímero de Gemini Live restringido al modelo Live configurado.
- Restricción explícita de respuesta a AUDIO.
- Orígenes de UGO/preview habilitados para evitar fallos CORS entre entornos de prueba.
- No se expusieron ni modificaron secretos en documentación.

## Evidencia runtime observada
Antes de las correcciones:
- Se observaron respuestas 503 y 429 en hugo-runtime.
- Hugo podía quedar cargando sin respuesta.

Después de la configuración:
- Se observaron llamadas autenticadas a hugo-runtime con HTTP 200 desde dispositivo móvil.
- Esto demuestra que el endpoint dejó de estar bloqueado por la misma condición inicial.
- HTTP 200 no demuestra por sí solo conversación Live completa.

## Evidencia CI disponible
En el lote de correcciones:
- TypeScript/build: PASS
- Core contract suite: PASS
- Lint de superficies críticas: PASS
- Lint de migración Cliente: PASS
- Hugo Voice contracts: PASS
- Hugo Timeout Runtime: PASS
- Cross Security Runtime: PASS

Limitaciones conocidas:
- Algunos jobs browser/runtime no llegaron a ejecutar Playwright porque falló la instalación de Chromium en el runner.
- El full-repo lint tenía deuda preexistente en archivos no relacionados; no debe confundirse con falla funcional del lote.

## Qué NO está verificado todavía
No declarar VERIFIED / READY por estos puntos hasta tener prueba real:
1. Cliente habla -> Gemini Live escucha -> responde con audio.
2. Segundo pedido por voz conserva continuidad.
3. Proveedor habla -> Gemini Live escucha -> responde con audio.
4. Hugo Proveedor ejecuta herramientas reales con resultado confirmado:
   - ponerse online/offline;
   - listar oportunidades;
   - aceptar/rechazar;
   - consultar trabajo activo;
   - avanzar lifecycle.
5. Oferta real llega en tiempo real al proveedor cercano con alerta/sonido.
6. Cliente elige Efectivo/Pix y el proveedor recibe el estado correcto sin quedar bloqueado.
7. Flujo Cliente -> Proveedor -> En camino -> Llegada -> Inicio -> Final -> Aprobación -> Pago -> Calificación.
8. Prueba real en dos dispositivos.
9. Persistencia de evidencia para gate Customer #1.
10. Disputa Cliente/Proveedor aún pendiente de prueba humana.

## Reglas de cierre
No marcar como VERIFIED por:
- demo;
- booleans;
- UI simulada;
- otro SHA;
- documentación;
- logs aislados sin correlación;
- HTTP 200 sin prueba funcional end-to-end.

Para cerrar:
executor -> evidence -> judge independiente -> Sentinel -> gate.

## Seguridad y ejecución
- No tocar producción sin autorización humana explícita.
- No force push.
- No reset destructivo.
- No revertir trabajo ajeno.
- No exponer secretos.
- No declarar GREEN/READY sin evidencia runtime persistida.
- UGO Arena sigue siendo el entorno de validación para este bloque.

## Próxima evidencia esperada
La siguiente evidencia válida debe demostrar, con el mismo SHA o correlación inequívoca:
- token Live válido;
- WebSocket Gemini Live conectado;
- audio de entrada reconocido;
- respuesta de audio reproducida;
- tool call si corresponde;
- acción persistida en UGO;
- resultado visible en Cliente/Proveedor;
- IDs de evidencia/correlación guardados.

## Referencias técnicas
- main merge de correcciones reales: 5044120dabdbcf1aba8e88525619c6894a3afad3
- main posterior observado: 5320602512168ee5ce1fc2ba463bd9d0ad698e22
- runtime TEST hugo-runtime: v3
- proyecto TEST: tmossnqfwfwjrtzwcbmm
