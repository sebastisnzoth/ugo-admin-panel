# UGO — Two-Device Physical Validation Runbook

**Estado inicial:** `IMPLEMENTED` como procedimiento; `MEASURED` pendiente hasta ejecución física real.  
**Entorno permitido:** UGO TEST solamente.  
**Supabase TEST:** `tmossnqfwfwjrtzwcbmm`  
**PROD:** `trfsjuseqjxlhrxuvdsm` — prohibido para esta prueba.  
**Web TEST:** `https://ugo-admin-panel.vercel.app`

> Principio: **Un pedido. Un profesional. Sin vueltas.**

---

## 1. Objetivo

Demostrar en dos celulares reales que Cliente y Proveedor pueden completar un servicio sobre el mismo `serviceId`, con Realtime, GPS, cámara, Storage, chat, pago, Hugo y UX móvil funcionando sin refresh manual.

No marcar nada como `MEASURED` sólo porque exista código, contrato o CI verde.

---

## 2. Dispositivos

Usar dos teléfonos físicos distintos:

```text
Celular A = Cliente
Celular B = Proveedor
```

Preferible:

- red móvil o Wi-Fi real;
- permisos reales de ubicación, cámara y micrófono;
- navegador/app en tamaño móvil real;
- batería suficiente para mantener GPS y cámara;
- mantener ambos equipos disponibles durante todo el recorrido.

No usar dos pestañas del mismo navegador como sustituto de dos dispositivos físicos.

---

## 3. URLs

Cliente:

```text
https://ugo-admin-panel.vercel.app/?app=client
```

Proveedor:

```text
https://ugo-admin-panel.vercel.app/?app=provider
```

Admin para auditoría posterior:

```text
https://ugo-admin-panel.vercel.app/?app=admin
```

---

## 4. Preflight

Antes de iniciar:

```text
[ ] main esperado
[ ] último Core CI verde
[ ] Vercel TEST READY
[ ] Supabase TEST operativo
[ ] Cliente TEST puede loguear
[ ] Proveedor TEST puede loguear
[ ] Proveedor verificado/habilitado
[ ] Proveedor puede ponerse online
[ ] ubicación permitida en ambos teléfonos
[ ] cámara permitida en Proveedor
[ ] micrófono permitido en Cliente
[ ] no se está usando Supabase PROD
```

Si alguno falla, registrar `BLOCKED` con causa exacta. No inventar workaround que cambie datos de producción.

---

## 5. Evidencia mínima a capturar

Registrar durante la prueba:

```text
fecha/hora local
SHA de main
CI usado
URL Vercel
cliente user/email TEST (sin password)
proveedor user/email TEST (sin password)
serviceId nuevo
estado inicial
estado final
2 paths Storage reales o evidencia equivalente visible en Admin
capturas Cliente
capturas Proveedor
captura Admin final
problemas observados
```

Nunca incluir passwords, tokens o secretos en screenshots, commits o documentos públicos.

---

## 6. Flujo Cliente

### C1 — Login

```text
[ ] abre Cliente
[ ] login correcto
[ ] Home carga sin pantalla vacía
[ ] no requiere refresh manual
```

### C2 — Hugo voz

```text
[ ] tocar micrófono
[ ] permiso de micrófono real
[ ] hablar pedido simple
[ ] transcripción correcta o suficientemente usable
[ ] respuesta no inventa proveedor/precio/disponibilidad
[ ] STOP interrumpe salida
[ ] después de STOP el compositor de texto sigue utilizable
```

Registrar latencia aproximada percibida y cualquier bloqueo del navegador.

### C3 — Hugo texto

```text
[ ] escribir el mismo tipo de pedido
[ ] contexto se conserva
[ ] puede corregir el pedido por texto
[ ] no obliga a usar voz
```

### C4 — Categoría / ubicación / cuándo

```text
[ ] categoría viene del catálogo real
[ ] dirección/ubicación es correcta
[ ] no pide dirección redundante si ya existe una válida
[ ] fecha/hora o urgencia quedan claras
```

### C5 — Confirmar pedido

```text
[ ] confirmar crea servicio real TEST
[ ] capturar serviceId nuevo
[ ] estado pasa a buscando/ofrecido según backend
[ ] UI muestra feedback real de búsqueda
[ ] cantidad/ofertas nunca son inventadas
```

### C6 — Matching / proveedor

```text
[ ] Cliente ve búsqueda sin quedar atrapado
[ ] Proveedor real aparece sólo cuando corresponde
[ ] tarjeta del proveedor muestra datos reales disponibles
[ ] al aceptar Proveedor, Cliente converge a asignado
```

### C7 — Cancelación

Este caso se prueba en una corrida separada o antes de aceptar, para no destruir la corrida principal:

```text
[ ] cancelar funciona
[ ] estado backend cambia
[ ] UI sale de búsqueda
[ ] no queda spinner infinito
[ ] no aparece pago/ingreso fantasma
```

No reutilizar esa corrida cancelada como recorrido principal.

### C8 — Tracking

En la corrida principal:

```text
[ ] Cliente ve estado en_camino
[ ] Cliente ve actualización de ubicación sin refresh
[ ] background/foreground rehidrata estado
[ ] reconnect vuelve a estado persistido correcto
```

### C9 — Chat

```text
[ ] Cliente envía mensaje
[ ] Proveedor lo recibe sin refresh
[ ] Proveedor responde
[ ] Cliente recibe sin refresh
[ ] mensajes siguen ligados al mismo serviceId
```

### C10 — Pago / revisión

```text
[ ] método de pago seleccionado correctamente
[ ] efectivo nunca se describe como protegido electrónicamente
[ ] Cliente no puede aprobar antes del gate correcto
[ ] después del cierre recibe revisión/aprobación
[ ] aprobar lleva a completado
```

### C11 — Historial

```text
[ ] servicio completado aparece en historial
[ ] proveedor/importe/estado coinciden
[ ] no aparece duplicado
```

---

## 7. Flujo Proveedor

### P1 — Login / online

```text
[ ] abre Proveedor
[ ] login correcto
[ ] perfil carga
[ ] puede alternar offline → online → offline → online
[ ] Cliente sólo lo considera disponible cuando corresponde
```

### P2 — Oportunidad

```text
[ ] recibe oportunidad del serviceId nuevo
[ ] aparece sin refresh manual
[ ] datos pre-asignación están redactados correctamente
[ ] aceptar funciona
[ ] rechazar funciona en una corrida separada
```

### P3 — Trabajo activo

La pantalla debe comportarse como misión:

```text
Problema → siguiente acción → mapa → evidencia → chat → terminar
```

Comprobar:

```text
[ ] problema visible
[ ] siguiente acción inequívoca
[ ] no hay burocracia innecesaria
[ ] mapa accesible
[ ] chat accesible
```

### P4 — En camino / GPS

```text
[ ] avanzar a en_camino
[ ] GPS obtiene ubicación real
[ ] caminar/moverse algunos metros
[ ] Cliente recibe cambios sin refresh
[ ] background/foreground no rompe tracking
[ ] reconnect no crea ubicación/estado falso
```

### P5 — Llegada

```text
[ ] llegada respeta gate backend
[ ] fuera de rango debe rechazarse cuando aplica geofence
[ ] dentro de rango permite llegado
```

### P6 — Evidencia Antes

```text
[ ] abrir cámara real
[ ] tomar foto real
[ ] upload termina
[ ] aparece confirmación usable
[ ] objeto queda en service-evidence
[ ] recién entonces permite iniciar trabajo
```

### P7 — Iniciar trabajo

```text
[ ] pasa a en_progreso
[ ] Cliente lo ve sin refresh
[ ] siguiente acción cambia correctamente
```

### P8 — Chat / ampliación

```text
[ ] chat bidireccional sigue funcionando
[ ] Proveedor propone ampliación si corresponde
[ ] Cliente la ve
[ ] Proveedor no puede autoaprobarla
[ ] Cliente resuelve
[ ] importes/tiempo se actualizan una sola vez
```

### P9 — Evidencia Después

```text
[ ] abrir cámara real
[ ] tomar foto final
[ ] upload real termina
[ ] objeto queda en service-evidence
[ ] no permite cierre si falta evidencia final
```

### P10 — Cierre

Para efectivo:

```text
en_progreso
→ evidencia Después
→ confirmar recepción del efectivo
→ esperando_aprobacion
→ aprobación Cliente
→ completado
```

Comprobar:

```text
[ ] retry de confirmación no duplica pago
[ ] Proveedor no puede aprobar por Cliente
[ ] al completarse no queda misión activa fantasma
[ ] ingreso visible coincide con pago del servicio
```

La visibilidad de ingreso NO implica que exista política final de retiro; saldo/retiro continúa bloqueado por decisión de producto.

---

## 8. Realtime / recovery

Durante la corrida principal forzar al menos una vez:

```text
[ ] bloquear pantalla Cliente y volver
[ ] bloquear pantalla Proveedor y volver
[ ] cambiar Wi-Fi ↔ datos móviles en un equipo si es seguro
[ ] perder conexión brevemente
[ ] recuperar conexión
```

Esperado:

```text
persistencia backend = verdad
UI rehidrata
sin duplicados
sin volver a estado anterior
sin refresh manual obligatorio
```

---

## 9. UX móvil

En ambos dispositivos:

```text
[ ] teclado no tapa CTA crítico
[ ] safe area inferior correcta
[ ] overlays no bloquean navegación
[ ] botones táctiles suficientemente grandes
[ ] scroll funciona
[ ] modal puede cerrarse
[ ] back del navegador no destruye servicio activo
[ ] orientación normal no rompe layout
```

Registrar modelo del teléfono, navegador y tamaño aproximado.

---

## 10. Admin final

Con el `serviceId` de la corrida principal:

```text
[ ] Admin encuentra el mismo servicio
[ ] estado = completado
[ ] mismo Cliente
[ ] mismo Proveedor
[ ] pago correcto
[ ] chat Cliente↔Proveedor visible según permisos
[ ] evidencia Antes visible
[ ] evidencia Después visible
[ ] no hay servicio/pago duplicado
```

---

## 11. Resultado

Usar sólo estos estados:

```text
IMPLEMENTED
VALIDATED
MEASURED
BLOCKED
```

Para este runbook:

```text
procedimiento existe → IMPLEMENTED
prueba física parcial → no subir a MEASURED global
prueba completa verde en dos equipos → MEASURED
bloqueo externo reproducible → BLOCKED con evidencia
```

---

## 12. Registro de corrida

Completar al ejecutar:

```text
Fecha:
SHA main:
CI:
Vercel deployment:
Celular Cliente:
Navegador Cliente:
Celular Proveedor:
Navegador Proveedor:
serviceId:
run/evidence reference:

Cliente login: PASS/FAIL
Hugo voz: PASS/FAIL
Hugo texto: PASS/FAIL
Matching: PASS/FAIL
Realtime: PASS/FAIL
Tracking GPS: PASS/FAIL
Chat: PASS/FAIL
Cámara Antes: PASS/FAIL
Storage Antes: PASS/FAIL
Ampliación: PASS/FAIL
Cámara Después: PASS/FAIL
Storage Después: PASS/FAIL
Pago/cierre: PASS/FAIL
Admin convergencia: PASS/FAIL
UX móvil: PASS/FAIL
Push: PASS/FAIL

Resultado global: MEASURED / BLOCKED
Observaciones:
```

---

## 13. Regla de salida

La prueba física no termina cuando “la pantalla abre”. Termina cuando dos dispositivos reales completan y convergen sobre el mismo servicio, sin refresh manual como requisito y con cámara/GPS/Storage/chat/pago/Realtime verificables.
