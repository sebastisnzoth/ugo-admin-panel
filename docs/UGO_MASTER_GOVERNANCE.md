# UGO — Master Governance

**Versión:** 1.1 · 11 de septiembre de 2026  
**Estado:** contrato superior de compatibilidad documental  
**Rama de verdad:** `main`  
**Entrada al sistema:** `UGO_MASTER_INDEX.md`

> UGO mantiene una sola realidad de producto dividida en documentos por autoridad. Este documento define cómo se resuelven incompatibilidades. `UGO_MASTER_INDEX.md` es la puerta de entrada; Governance es la autoridad de compatibilidad.

---

# 1. Sistema maestro

| Documento | Autoridad |
|---|---|
| `UGO_MASTER_INDEX.md` | índice, navegación y resumen transversal |
| `UGO_MASTER_GOVERNANCE.md` | vocabulario, compatibilidad y conflictos |
| `UGO_DEVELOPMENT_MASTER.md` | proceso de desarrollo, roles, sprints y ejecución |
| `UGO_ECOSISTEMA_FLUJO.md` | producto, actores, journeys y estados funcionales |
| `UGO_UIUX_MAESTRO.md` | experiencia, navegación, Design System y contratos UX |
| `UGO_UIUX_STITCH_MASTER.md` | generación/adaptación visual con Stitch |
| `UGO_ARQUITECTURA_TECNICA_MASTER.md` | estructura, fronteras y responsabilidades técnicas |
| `UGO_DATA_BACKEND_MASTER.md` | datos, RLS, RPC, Realtime, Storage e integridad |
| `UGO_TESTING_RELEASE_MASTER.md` | calidad, validación, release y Definition of Done |
| `UGO_ROADMAP_MASTER.md` | estado de ejecución y prioridad P0–P3 |

El Index no reemplaza estos contratos: los conecta.

---

# 2. Jerarquía de resolución

```text
Seguridad / integridad ejecutable
→ estado persistido real
→ Governance
→ flujo funcional
→ arquitectura
→ UI/UX
→ Stitch
→ roadmap/planificación
```

Development define **cómo** cambiar el sistema. Testing/Release determina si el cambio quedó VALIDATED/RELEASED.

Reglas:

- Stitch nunca inventa estados de dominio.
- UI nunca llama protegido a un pago en efectivo.
- Roadmap no marca HECHO un P0 que no superó la validación aplicable.
- Frontend no habilita una transición prohibida por backend.
- Un mock no se convierte en función real por aparecer en diseño.
- Código integrado no equivale automáticamente a producto terminado.

---

# 3. Vocabulario canónico

## Roles

```text
Cliente · Proveedor · Admin · Super Admin
Scout · Hugo · Academia UGO
```

## Circuito

```text
Necesidad → búsqueda → solicitud → matching → asignación
→ contratación/pago → ejecución → evidencia → aprobación
→ cobro → reputación → datos → inteligencia → mejora
```

## Servicio

```text
solicitado → buscando → ofertado → asignado
→ pago_pendiente / pago_habilitado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

`pago_protegido` aplica a métodos electrónicos con custodia; no es requisito universal para efectivo.

Excepciones:

```text
cancelado · disputado · reembolsado
```

## Proveedor

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

## Pago electrónico

```text
pendiente → autorizado → retenido/protegido
→ liberación pendiente → liberado/pagado
```

## Efectivo

```text
seleccionado → presencial pendiente → servicio habilitado
→ proveedor confirma recepción → registrado
```

**Efectivo no tiene custodia electrónica UGO.**

---

# 4. Madurez y prioridad

Madurez profesional:

```text
IDEA → DEFINED → READY → IN PROGRESS
→ IMPLEMENTED → VALIDATED → RELEASED → MEASURED
```

Prioridad:

```text
P0 integridad/core/seguridad/dinero
P1 operación necesaria
P2 inteligencia/optimización/escala
P3 expansión/polish
```

Estado Roadmap:

```text
✅ HECHO      validación aplicable satisfecha
🟡 PARCIAL   existe pero no está completamente validado/cerrado
⬜ PENDIENTE no existe o no cierra
⛔ BLOQUEADO dependencia externa/decisión
```

---

# 5. Contrato de confianza

Toda función debe contribuir al menos a uno de:

```text
Identidad
Trazabilidad
Pago claro
Evidencia
Reputación
Soporte/Disputa
Seguridad
Calidad
```

UGO Shield representa señales de confianza; no es una promesa financiera universal.

---

# 6. UI/UX transversal

```text
Estado → contexto → próxima acción
```

Datos:

```text
loading · loaded · empty · error/retry · offline/degraded
```

Mutaciones:

```text
idle → submitting → success / error + recovery
```

Referencia mobile `390×844`, rango `360–430`, targets `≥48px`, safe areas obligatorias. Desktop es aplicación web real.

Design language: **Kinetic Trust**. Tokens canónicos: `src/mvp/ugo-design-system.css`.

---

# 7. Cliente ↔ Proveedor

```text
Cliente crea solicitud + evidencia
→ matching genera oportunidad sobre el mismo servicio
→ Proveedor ve contexto autorizado
→ acepta/rechaza
→ asignación única
→ ambos observan el mismo estado persistido
```

`serviceId` es contrato transversal.

---

# 8. Evidencias

```text
Evidencia de solicitud
  antes del matching

Evidencia operacional
  Antes / Durante / Después
```

Storage privado, RLS, signed URLs. Los guards críticos terminan en backend/RPC.

---

# 9. Ampliar servicio

Categoría: **Mejoras de flujo de trabajo**.

```text
Cliente o Proveedor propone
→ descripción + tiempo + costo
→ Cliente aprueba/rechaza
→ registro auditable
→ reconciliación de pago
→ continúa servicio
```

No modificar silenciosamente un pago electrónico protegido.

---

# 10. Hugo, Scout y Academia

Hugo es capacidad contextual transversal y no salta permisos/estados/pagos.

Scout:

```text
Dato → interpretación → recomendación → acción → resultado
```

Academia:

```text
gap/calidad → diagnóstico → formación → evaluación/certificación
→ mejora perfil → mejores oportunidades → nueva medición
```

---

# 11. Admin / Super Admin

```text
Admin: operación → personas → finanzas → disputas → calidad
Super Admin: permisos → configuración → matching → integraciones
             → feature flags → auditoría → estrategia
```

Acciones privilegiadas requieren autorización backend.

---

# 12. Contrato técnico

```text
React/TypeScript/Vite
→ flows por rol
→ servicios/adapters
→ Supabase RLS/RPC/Realtime/Storage
→ Vercel API para secretos/integraciones
```

- `main` es integración oficial.
- no aplicaciones paralelas por rol;
- no clientes Supabase arbitrarios por componente;
- no secretos/service role en browser;
- Realtime refleja DB;
- mutaciones críticas atómicas/idempotentes;
- migraciones versionadas;
- Stitch aporta diseño, no arquitectura runtime.

---

# 13. Contrato de calidad

```text
IMPLEMENTED ≠ VALIDATED ≠ RELEASED
```

DONE ecosistémico requiere los gates aplicables de:

```text
flujo
UI/UX
arquitectura
datos/RLS/RPC
Realtime/Storage
happy/error/offline
responsive/accesibilidad
build/TypeScript
E2E
deploy/smoke
Roadmap actualizado
```

---

# 14. Ciclo único de cambio

```text
Idea
→ definición producto
→ UX
→ impacto arquitectura/datos/seguridad
→ READY
→ vertical slice
→ implementación
→ review
→ Testing
→ VALIDATED
→ deploy/smoke
→ RELEASED
→ medición
→ Roadmap
```

No es obligatorio modificar todos los maestros; sólo los que sean autoridad del cambio.

---

# 15. Referencias

Los maestros se referencian mediante nombres canónicos y evitan duplicar grandes especificaciones. Inventarios, ramas históricas, Penpot/Stitch y documentos específicos son evidencia/referencia, no autoridad superior.

---

# 16. P0 común actual

```text
1 Build/TypeScript main
2 RLS/guards backend recientes
3 Cliente solicitud + evidencia integrada
4 Matching + oportunidad Provider + serviceId
5 Pagos electrónico/efectivo + timeline + cierre method-aware
6 Retirar Provider legacy como salida operacional
```

Este baseline cambia únicamente cuando `UGO_ROADMAP_MASTER.md` registra cierre validado y el nuevo orden.

---

# 17. Regla final

**UGO es un solo ecosistema con un solo dominio operacional y múltiples experiencias por rol.**

Producto, diseño, desarrollo, código, datos, IA, pagos, pruebas, operación y roadmap deben describir la misma realidad.