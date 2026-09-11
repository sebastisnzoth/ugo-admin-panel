# UGO — Arquitectura Técnica Master

**Versión:** 2.0 · 11 de septiembre de 2026  
**Estado:** contrato técnico vivo  
**Repositorio:** `sebastisnzoth/ugo-admin-panel`  
**Rama de integración:** `main`

> El flujo maestro define qué ocurre; UI/UX define cómo se entiende; Data/Backend define la verdad persistida; este documento define dónde vive cada responsabilidad y cómo evoluciona UGO sin crear sistemas paralelos.

---

# 1. Principios de arquitectura

1. `main` es la fuente integrada.
2. No crear un segundo UGO para resolver una pantalla.
3. Cliente, Proveedor, Admin y Web comparten dominio y Design System, pero conservan responsabilidades por rol.
4. `serviceId` es identidad transversal del trabajo.
5. Estado de servicio y estado operacional del proveedor son máquinas distintas.
6. UI no reemplaza autorización ni integridad backend.
7. Realtime sincroniza persistencia; no crea otra verdad.
8. Pagos son method-aware: electrónico y efectivo tienen contratos distintos.
9. Stitch/Figma/Penpot son referencias de diseño, no runtime.
10. Arquitectura objetivo: simple, trazable, serverless, barata de operar y reemplazable por capas.

---

# 2. Stack canónico actual

Frontend:

```text
React 19
TypeScript 6
Vite 8
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
TomTom Maps SDK
OSM/Overpass donde corresponda
```

Runtime:

```text
Vercel serverless /api
```

Build:

```bash
npm run build
# tsc -b && vite build
```

---

# 3. Superficies

`src/main.tsx` arranca la app. `src/mvp/MvpApp.tsx` selecciona superficie por `?app=`.

Contrato:

```text
?app=client      → Cliente
?app=provider    → Proveedor
?app=admin       → Admin/Super Admin gate
?app=web         → Web
?app=client-web  → experiencia web cliente cuando aplique
sin app          → Landing
```

No agregar nuevas raíces para resolver variantes visuales si la capacidad pertenece a una superficie existente.

---

# 4. Fronteras por rol

## Cliente

Responsabilidades UI:

```text
auth/onboarding
home/radar
búsqueda/categorías
solicitud/evidencia
matching
servicio/pago
tracking
ampliaciones
aprobación/disputa
historial/reputación
```

## Proveedor

```text
auth/onboarding/KYC
home
Demanda
Oportunidades
detalle de oportunidad
trabajo activo
tracking propio
evidencia
ampliaciones
ganancias
historial/disputa
```

Demanda y Oportunidades deben permanecer separadas.

## Admin / Super Admin

```text
operación
personas/KYC
servicios
finanzas/retiros
disputas
calidad
Scout
configuración
permisos/auditoría
```

---

# 5. Estado y navegación

La navegación UI puede ser local, pero el dominio crítico debe derivar de persistencia.

Regla:

```text
screen state != domain state
```

`clientFlow` y `providerFlow` coordinan navegación/acciones, pero no deben convertirse en segunda base de datos.

---

# 6. Contrato Cliente ↔ Proveedor

```text
Cliente crea solicitud
→ backend crea/persiste serviceId
→ matching produce oferta ligada al serviceId
→ Proveedor autorizado consulta
→ aceptación atómica
→ servicio asignado
→ ambos roles se sincronizan sobre el mismo registro
```

Nunca crear un “job” paralelo desconectado del servicio sólo para la vista del proveedor.

---

# 7. Máquina de estado

Servicio:

```text
solicitado → buscando → ofertado → asignado
→ pago_pendiente / pago_habilitado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Proveedor:

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

Los componentes pueden derivar labels locales, pero no redefinir el dominio.

---

# 8. Pagos

Arquitectura de pagos debe abstraer método:

```text
PaymentMethod
  electronic
  cash
```

Electrónico puede tener autorización, custodia, webhook, liberación/reembolso.

Efectivo registra selección, habilitación, confirmación presencial y obligación/comisión UGO cuando aplique.

No compartir copy o flags de `protected` con efectivo.

---

# 9. Backend boundaries

Frontend puede:

- solicitar mutaciones;
- mostrar optimistic feedback reversible;
- bloquear doble click;
- renderizar permisos conocidos.

Backend debe:

- validar identidad/rol;
- validar estado anterior;
- validar participación;
- aplicar transición atómica;
- reconciliar dinero;
- impedir doble aceptación;
- autorizar evidencia/Storage;
- registrar acciones críticas.

---

# 10. Adapters e integraciones

Toda integración externa debe quedar detrás de una frontera clara:

```text
UI/domain intent
→ adapter/service
→ API externa
→ normalización
→ persistencia
```

Aplicar a pagos, mapas, WhatsApp/email/push, IA y futuras integraciones.

Objetivo: poder sustituir proveedor externo sin reescribir journeys.

---

# 11. Realtime

Realtime sólo dispara sincronización de datos persistidos.

Buenas prácticas:

```text
canal filtrado
cleanup
reconexión
refetch
sin duplicados
sin autorización implícita
```

Cliente y Proveedor deben converger al mismo estado tras reconexión.

---

# 12. Storage/evidencias

Uploads sensibles:

```text
UI
→ validación cliente básica
→ bucket privado
→ metadata vinculada a draft/serviceId
→ RLS/policy
→ signed URL autorizada
```

El path físico no es permiso.

---

# 13. Design System

Tokens canónicos: `src/mvp/ugo-design-system.css` y capas de UI asociadas.

Reglas:

- reutilizar antes de duplicar;
- no crear una paleta por pantalla;
- targets táctiles ≥48px;
- safe areas;
- responsive real;
- estados loading/empty/error/offline comunes.

---

# 14. Legacy

Código legacy puede coexistir temporalmente sólo con propósito de migración.

No debe:

- ser una segunda salida operacional;
- recibir nuevas features;
- duplicar reglas de estado;
- bloquear evolución del shell nuevo.

P0: retirar rutas/uso operacional de Provider legacy cuando el nuevo flujo pase smoke.

---

# 15. Observabilidad mínima

Toda vertical crítica debe poder responder:

```text
qué pasó
para qué usuario/serviceId
qué estado anterior/nuevo
qué integración falló
si hubo retry
tiempo de respuesta
resultado final
```

Errores de producción deben ser accionables, no sólo console logs.

---

# 16. Cost discipline

Mientras UGO valida mercado:

- usar tiers gratuitos/low-cost razonables;
- evitar infraestructura permanente innecesaria;
- preferir serverless y servicios gestionados;
- medir consumo antes de escalar;
- no comprometer seguridad/integridad por ahorro.

---

# 17. Definition of Done técnica

```text
contrato de dominio respetado
sin nueva fuente de verdad
backend/RLS/RPC correcto
states/error/retry
types/build/lint
tests del tramo
responsive/accesibilidad
observabilidad aplicable
documentación afectada actualizada
```

---

# 18. Regla final

**Toda nueva pieza debe integrarse al circuito existente; si para agregar una función hace falta inventar otro estado, otra base o otra app paralela, primero se revisa el diseño del sistema.**