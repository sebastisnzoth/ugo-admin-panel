# UGO — Roadmap Master

**Versión:** 1.1 · 11 de septiembre de 2026  
**Estado:** tablero maestro vivo de ejecución  
**Rama de verdad:** `main`  
**Gobernado por:** `UGO_MASTER_GOVERNANCE.md`

> Este documento registra prioridad y madurez. `IMPLEMENTADO ≠ VALIDADO ≠ RELEASED`: sólo Testing & Release puede habilitar un `✅ HECHO` definitivo.

---

# 1. Estados

```text
✅ HECHO      integrado + validación requerida satisfecha
🟡 PARCIAL   implementado total/parcial, falta validación/cierre
⬜ PENDIENTE no implementado/cerrado
⛔ BLOQUEADO depende de tercero/infra/decisión
```

```text
P0 integridad/core/seguridad/dinero
P1 experiencia operacional necesaria
P2 inteligencia/escala
P3 expansión/polish
```

---

# 2. North Star

```text
Necesidad → búsqueda → solicitud → matching → asignación
→ contratación/pago → ejecución → evidencia → aprobación
→ cobro → reputación → datos → inteligencia → mejora
```

Objetivo: servicio confiable, trazable y completado dentro de UGO.

---

# 3. Cliente

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| Auth/Recovery | 🟡 | P0 | smoke/regresión |
| Onboarding | 🟡 | P1 | validación |
| Home/Radar | 🟡 | P1 | consolidación visual + smoke |
| Categorías/Búsqueda | 🟡 | P1 | regresión |
| Solicitud | 🟡 | P0 | fotos dentro del formulario |
| Evidencia previa | 🟡 | P0 | draft id + RLS + E2E |
| Matching | 🟡 | P1 | estados/error/alternativas |
| Proveedor seleccionado | 🟡 | P1 | UX consolidada |
| Pago electrónico | 🟡 | P0 | timeline + reconciliación |
| Efectivo | 🟡 | P0 | copy + idempotencia + E2E |
| Tracking/ETA | 🟡 | P1 | realtime/fallback |
| Servicio activo | 🟡 | P0 | narrativa única |
| Ampliar servicio | 🟡 | P0 | E2E pago/estado |
| Evidencia final | 🟡 | P0 | guard backend |
| Aprobación/Disputa | 🟡 | P0 | método-aware + E2E |
| Historial/Reputación | 🟡 | P1 | validación integrada |
| Notificaciones | 🟡 | P1 | contrato de eventos |

Se eliminan estados `✅` basados únicamente en existencia de código hasta completar el gate de release correspondiente.

---

# 4. Proveedor

| Área | Estado | P | Próximo cierre |
|---|---|---:|---|
| Shell nuevo | 🟡 | P0 | smoke + retirar legacy |
| Auth/Onboarding/KYC | 🟡 | P0 | roles/RLS/regresión |
| Home | 🟡 | P1 | validación datos/estado |
| Demanda | 🟡 | P1 | fuente de mercado independiente |
| Oportunidades | 🟡 | P0 | `serviceId` + E2E |
| Evidencia cliente | 🟡 | P0 | build/RLS/E2E |
| Aceptar/Rechazar | 🟡 | P0 | atomicidad/concurrencia |
| Trabajo activo | 🟡 | P0 | guards backend |
| Tracking | 🟡 | P1 | ETA/ruta/reconexión |
| Evidencia operacional | 🟡 | P0 | enforcement backend |
| Ampliar servicio | 🟡 | P0 | E2E |
| Efectivo recibido | 🟡 | P0 | idempotencia/E2E |
| Cobro/Ganancias | 🟡 | P1 | timeline financiero |
| Hugo Asistente | 🟡 | P2 | contexto antes/durante/después |
| ProviderApp legacy | ⬜ | P0 | retirar salida operacional |

---

# 5. Admin / Super Admin

| Área | Estado | P |
|---|---|---:|
| AdminGate/Auth | 🟡 | P0 |
| Operaciones | 🟡 | P1 |
| Personas/KYC | 🟡 | P1 |
| Finanzas/Retiros | 🟡 | P0 |
| Disputas | 🟡 | P0 |
| Reportes | 🟡 | P2 |
| Configuración | 🟡 | P1 |
| Scout | 🟡 | P2 |
| Super Admin | 🟡 | P1 |
| Roles/feature flags | 🟡 | P0 |
| Auditoría crítica | 🟡 | P0 |

Admin prioriza decisiones/excepciones; Super Admin gobierna reglas y permisos.

---

# 6. Backend / Seguridad P0

```text
[ ] build/TypeScript main
[ ] auditar RLS flujos recientes
[ ] guard backend evidencia inicial/final
[ ] draft/request id evidencias_solicitud
[ ] serviceId único Cliente↔Proveedor
[ ] RPC transiciones servicio
[ ] atomicidad aceptar oportunidad
[ ] idempotencia pagos/efectivo/retiros
[ ] autorización Admin/Super server-side
[ ] Storage policies evidencia
```

---

# 7. Pagos P0

```text
[ ] timeline electrónico desde estado real
[ ] timeline efectivo desde estado real
[ ] cierre consciente del método
[ ] efectivo nunca etiquetado protegido
[ ] expansión + pago protegido
[ ] reconciliación de importes
[ ] E2E pago → servicio → cierre
[ ] DEMO/REAL inequívoco
```

---

# 8. UI/UX / Stitch

Documentación de autoridad ya existe. Ejecución pendiente:

```text
[ ] Cliente converge a un lenguaje Kinetic Trust
[ ] Provider converge sin copiar legacy
[ ] Admin/Super Admin converge
[ ] Landing/Web responsive final
[ ] eliminar overlays competitivos
[ ] componentes compartidos antes de duplicados
```

Stitch diseña; contratos UGO y `main` gobiernan.

---

# 9. Realtime / Notificaciones P1

```text
[ ] subscriptions estables + cleanup
[ ] reconexión/refetch
[ ] eventos de dominio comunes
[ ] centro de notificaciones
[ ] push/WhatsApp sólo cuando backend/config lo soporte
```

---

# 10. Hugo P1/P2

```text
Cliente    ayuda contextual
Proveedor  checklist → seguridad → diagnóstico → ampliación
           → evidencia → cierre → aprendizaje
Admin      soporte operacional autorizado
```

No chatbot aislado; no bypass de permisos/estado.

---

# 11. Scout P2

```text
demanda real
oferta/cobertura
gaps proveedor
conversiones
tendencias/freshness
campañas
calidad
alertas accionables
```

`Dato → interpretación → recomendación → acción → resultado`.

---

# 12. Academia P3

```text
Scout/calidad detecta gap
→ diagnóstico
→ ruta/contenido
→ evaluación/certificación
→ mejora perfil/calidad
→ mejores oportunidades
→ Scout vuelve a medir
```

Puede subir de prioridad si resuelve un problema P0/P1 de calidad.

---

# 13. Testing / Release inmediato

```text
[ ] npm run build
[ ] lint
[ ] smoke Cliente
[ ] smoke Proveedor
[ ] E2E tramo solicitud→oportunidad
[ ] RLS evidencia/ampliaciones
[ ] cash/electrónico
[ ] mobile 390×844
[ ] desktop
[ ] CI/Vercel
```

Sólo después actualizar `🟡` a `✅`.

---

# 14. Ramas

No mergear ramas históricas completas por defecto.

Integradas/obsoletas candidatas: `feat/admin-stitch-ui`, `feat/mvp-operational-flow`, `stage-2-end-to-end`, `feat/client-stitch-ui`.

Preservar/auditar selectivamente: `feat/client-ui-penpot`, `feat/client-ui-stitch`, `feat/client-web-stitch`, `feat/client-ui-stitch-sync`, `feat/admin-superadmin-stitch-sync`, `feat/provider-home-stage-4-1`, `feat/design-system-v1`, `feat/ugo-ui-professional`.

No borrar hasta rescate verificado.

---

# 15. Núcleo documental

```text
UGO_MASTER_GOVERNANCE.md               compatibilidad superior
UGO_ECOSISTEMA_FLUJO.md                producto/flujo
UGO_UIUX_MAESTRO.md                    experiencia
UGO_UIUX_STITCH_MASTER.md              Stitch
UGO_ARQUITECTURA_TECNICA_MASTER.md     arquitectura
UGO_DATA_BACKEND_MASTER.md             datos/backend
UGO_TESTING_RELEASE_MASTER.md           calidad/release
UGO_ROADMAP_MASTER.md                   ejecución
```

Governance no agrega un dominio: coordina las siete autoridades.

---

# 16. Orden de ejecución

```text
1 Build/TypeScript main
2 RLS/guards/idempotencia
3 Cliente solicitud + evidencia integrada
4 Provider oportunidad + serviceId
5 Pago timeline + cierre method-aware
6 retirar Provider legacy
7 Tracking/ETA
8 Notificaciones
9 consolidación UI
10 Admin financiero/operacional
11 Scout + Hugo avanzado
12 Academia/expansión
```

---

# 17. Criterio MVP

Un usuario nuevo puede:

```text
registrarse
→ pedir servicio con evidencia
→ encontrar proveedor
→ contratar/pagar
→ seguir llegada
→ ejecutar con evidencia
→ ampliar trazablemente
→ aprobar/disputar
→ cerrar pago
→ calificar
```

Proveedor puede completar/cobrar; Admin puede resolver excepciones; permisos, dinero y evidencia están protegidos; E2E y release gates pasan.

---

# 18. Regla final

**Primero cerrar y validar el circuito; después ampliar el ecosistema.**