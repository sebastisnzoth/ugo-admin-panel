# UGO — Roadmap Master

**Versión:** 1.0 · 11 de septiembre de 2026  
**Estado:** tablero maestro vivo de ejecución  
**Rama de verdad:** `main`

> Este documento ordena qué está HECHO, PARCIAL, PENDIENTE o BLOQUEADO. No sustituye GitHub; establece prioridad y evita desarrollar funciones nuevas antes de cerrar contratos críticos.

---

# 1. Leyenda

```text
✅ HECHO      integrado en main
🟡 PARCIAL   existe pero necesita cierre/validación
⬜ PENDIENTE todavía no cerrado
⛔ BLOQUEADO depende de tercero/infra/decisión
```

Prioridad:

```text
P0 integridad/core/seguridad/dinero
P1 experiencia operacional necesaria
P2 inteligencia/escala
P3 expansión/polish
```

---

# 2. Objetivo de producto

Circuito a cerrar:

```text
Necesidad → búsqueda → matching → contratación → pago
→ ejecución → evidencia → aprobación → cobro
→ reputación → datos → inteligencia → mejora
```

North Star de ejecución: servicio confiable, trazable y completado dentro de UGO.

---

# 3. Cliente

| Área | Estado | Prioridad | Próximo cierre |
|---|---|---|---|
| Auth/Recovery | ✅ | P0 | regresión |
| Onboarding | ✅ | P1 | polish |
| Home/Radar | ✅ | P1 | consolidar generación visual |
| Categorías/Búsqueda | ✅ | P1 | regresión |
| Solicitud | 🟡 | P0 | integrar fotos dentro del formulario real |
| Evidencia previa | 🟡 | P0 | draft explícito + validar tipos/build |
| Matching | 🟡 | P1 | estados/error/alternativas |
| Proveedor seleccionado | 🟡 | P1 | consolidar UX Stitch |
| Pago electrónico | 🟡 | P0 | timeline/reconciliación |
| Efectivo | ✅/🟡 | P0 | copy final + E2E |
| Tracking/ETA | 🟡 | P1 | cerrar experiencia realtime |
| Servicio activo | 🟡 | P0 | narrativa única |
| Ampliar servicio | ✅/🟡 | P0 | E2E pagos |
| Evidencia final | ✅/🟡 | P0 | guard backend |
| Aprobación/Disputa | 🟡 | P0 | wording por método de pago |
| Historial | ✅/🟡 | P1 | integración visual |
| Notificaciones | 🟡 | P1 | centro unificado |

---

# 4. Proveedor

| Área | Estado | Prioridad | Próximo cierre |
|---|---|---|---|
| Shell Provider nuevo | ✅ | P0 | eliminar dependencia legacy |
| Auth/Onboarding | ✅/🟡 | P0 | regresión/KYC |
| Home | ✅ | P1 | datos/estado final |
| Demanda | 🟡 | P1 | fuente independiente de mercado |
| Oportunidades | 🟡 | P0 | verificar `serviceId` + E2E |
| Evidencia cliente antes de aceptar | ✅/🟡 | P0 | build/RLS |
| Aceptar/Rechazar | ✅/🟡 | P0 | concurrencia/doble acción |
| Trabajo activo | ✅/🟡 | P0 | guards backend |
| Ubicación/Tracking | 🟡 | P1 | ETA/ruta/reconexión |
| Evidencia operacional | ✅/🟡 | P0 | backend enforcement |
| Ampliar servicio | ✅/🟡 | P0 | E2E |
| Efectivo recibido | ✅/🟡 | P0 | idempotencia/E2E |
| Cobro/ganancias | 🟡 | P1 | timeline financiero |
| Hugo Asistente de Trabajo | 🟡 | P2 | integración contextual completa |
| ProviderApp legacy | ⬜ | P0 | retirar como salida operacional |

---

# 5. Admin / Super Admin

| Área | Estado | Prioridad |
|---|---|---|
| AdminGate/Auth | ✅/🟡 | P0 |
| Operaciones | 🟡 | P1 |
| Personas/Verificación | 🟡 | P1 |
| Finanzas | 🟡 | P0 |
| Retiros | 🟡 | P0 |
| Disputas | 🟡 | P0 |
| Reportes | 🟡 | P2 |
| Configuración | 🟡 | P1 |
| Scout | 🟡 | P2 |
| Super Admin Command Center | 🟡 | P1 |
| Roles/permisos/feature flags | 🟡 | P0 |
| Auditoría crítica | ⬜/🟡 | P0 |

Prioridad Admin: decisiones y excepciones, no sumar dashboards decorativos.

---

# 6. Data / Backend

P0:

```text
[ ] auditar RLS de tablas nuevas
[ ] enforcement backend evidencia antes/final
[ ] draft/request id para evidencias_solicitud
[ ] verificar RPC transiciones servicio
[ ] idempotencia pagos/efectivo/retiros
[ ] contrato serviceId oportunidades
```

P1:

```text
[ ] eventos/notificaciones de dominio unificados
[ ] Payment Timeline data contract
[ ] estabilizar Realtime/subscriptions
[ ] auditoría financiera
```

P2:

```text
[ ] vistas agregadas Scout
[ ] observabilidad
[ ] políticas de retención/privacidad
[ ] tests automáticos RLS
```

---

# 7. UI/UX / Stitch

✅ `UGO_UIUX_MAESTRO.md`  
✅ `UGO_UIUX_STITCH_MASTER.md` v1.1 con características auditadas de ramas Stitch.  
🟡 Consolidar visualmente Cliente evitando múltiples generaciones CSS.  
🟡 Migrar Provider al mismo lenguaje Kinetic Trust sin copiar UI histórica.  
⬜ convergencia Admin/Super Admin.  
⬜ Landing/Web final responsive.

Regla: Stitch diseña; main y contratos UGO gobiernan.

---

# 8. Pagos

P0:

```text
[ ] timeline electrónico visible
[ ] timeline efectivo visible
[ ] copy cierre según método
[ ] expansión + pago protegido
[ ] reconciliación de importes
[ ] E2E pago → servicio → liberación
[ ] DEMO/REAL inequívoco
```

P1: saldo/wallet sólo si backend real lo soporta; comprobantes; ganancias proveedor; retiros end-to-end.

---

# 9. Seguridad

P0:

```text
[ ] RLS matrix Cliente/Proveedor/Admin
[ ] Storage policies evidencia
[ ] KYC sensible aislado
[ ] autorización Admin/Super Admin server-side
[ ] no service-role en browser
[ ] acciones monetarias idempotentes
[ ] pruebas actor autorizado/no autorizado
```

P1: auditoría, alertas operativas y revisión de dependencias.

---

# 10. Hugo

P1/P2:

```text
Cliente: ayuda contextual
Proveedor: antes/durante/después
Admin: soporte operacional
```

Prioridad de Proveedor:

```text
checklist → materiales → seguridad → diagnóstico
→ recomendaciones → incidencia/ampliación
→ cierre/evidencia → aprendizaje
```

No convertir Hugo en chatbot aislado.

---

# 11. Scout

P2:

```text
demanda real
oferta/cobertura
gaps proveedor
conversiones
freshness/tendencias
campañas
calidad
alertas accionables
```

Contrato: `Dato → interpretación → recomendación → acción → resultado`.

---

# 12. Academia UGO

P3 después de estabilizar operación core:

```text
diagnóstico
ruta de aprendizaje
contenido
evaluación
certificación
impacto en oportunidades
```

Puede priorizarse antes únicamente si una necesidad concreta de calidad/proveedor lo exige.

---

# 13. Testing / Release

P0 inmediato:

```text
[ ] npm run build sobre main actual
[ ] corregir TypeScript si aparece
[ ] smoke Cliente
[ ] smoke Proveedor
[ ] RLS de evidencia/ampliaciones
[ ] pagos cash/electrónico
[ ] revisar estado Vercel/CI
```

Después: automatizar E2E y policy tests.

---

# 14. Ramas

Auditoría en curso. No mergear ramas históricas completas por defecto.

Candidatas ya integradas/obsoletas detectadas:

```text
feat/admin-stitch-ui
feat/mvp-operational-flow
stage-2-end-to-end
feat/client-stitch-ui
```

Con material a preservar/auditar:

```text
feat/client-ui-penpot
feat/client-ui-stitch
feat/client-web-stitch
feat/client-ui-stitch-sync
feat/admin-superadmin-stitch-sync
feat/provider-home-stage-4-1
feat/design-system-v1
feat/ugo-ui-professional
```

No borrar hasta finalizar rescate selectivo.

---

# 15. Documentación maestra

```text
✅ UGO_ECOSISTEMA_FLUJO.md
✅ UGO_UIUX_MAESTRO.md
✅ UGO_UIUX_STITCH_MASTER.md
✅ UGO_ARQUITECTURA_TECNICA_MASTER.md
✅ UGO_DATA_BACKEND_MASTER.md
✅ UGO_TESTING_RELEASE_MASTER.md
✅ UGO_ROADMAP_MASTER.md
```

Estos siete documentos forman el núcleo de gobierno de UGO.

---

# 16. Orden recomendado desde hoy

```text
1 P0 Build/TypeScript main
2 P0 Backend/RLS/guards recientes
3 P0 Cliente solicitud + evidencia integrada
4 P0 Provider oportunidades + serviceId
5 P0 Pago timeline + cierre método-aware
6 P1 Tracking/ETA
7 P1 Notificaciones
8 P1 Consolidación UI Cliente/Proveedor
9 P1 Admin financiero/operacional
10 P2 Scout + Hugo avanzado
11 P3 Academia/expansión
```

---

# 17. Criterio de lanzamiento MVP

UGO puede considerarse MVP operacional cuando un usuario nuevo puede completar sin intervención manual extraordinaria:

```text
registrarse
→ pedir servicio con evidencia
→ encontrar proveedor
→ contratar/pagar
→ seguir llegada
→ ejecutar con evidencia
→ ampliar de forma trazable
→ aprobar/disputar
→ cerrar pago
→ calificar
```

Y cuando Admin puede resolver las excepciones críticas con permisos correctos.

---

# 18. Regla final

**Primero cerrar el circuito; después ampliar el ecosistema.**

Cada nueva idea debe demostrar que mejora confianza, calidad, conversión, eficiencia o trazabilidad sin retrasar un P0 pendiente.