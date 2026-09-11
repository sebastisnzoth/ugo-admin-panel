# UGO — Master Governance

**Versión:** 1.0 · 11 de septiembre de 2026  
**Estado:** contrato superior de compatibilidad documental  
**Rama de verdad:** `main`

> Este documento armoniza los siete documentos maestros de UGO. Cuando dos documentos describan el mismo concepto con distinto nivel de detalle, se aplica la jerarquía y los contratos definidos aquí. No crea un octavo dominio: gobierna la compatibilidad entre los siete.

---

# 1. Los siete maestros y su autoridad

| Documento | Autoridad |
|---|---|
| `UGO_ECOSISTEMA_FLUJO.md` | producto, actores, journeys y estados funcionales |
| `UGO_UIUX_MAESTRO.md` | experiencia, navegación, Design System y contratos UX |
| `UGO_UIUX_STITCH_MASTER.md` | generación/adaptación visual con Google Stitch |
| `UGO_ARQUITECTURA_TECNICA_MASTER.md` | estructura de aplicación, fronteras y responsabilidades técnicas |
| `UGO_DATA_BACKEND_MASTER.md` | datos, RLS, RPC, Realtime, Storage e integridad |
| `UGO_TESTING_RELEASE_MASTER.md` | calidad, validación, release y Definition of Done |
| `UGO_ROADMAP_MASTER.md` | estado de ejecución y prioridad P0–P3 |

Ningún documento puede redefinir silenciosamente la autoridad de otro.

---

# 2. Jerarquía de resolución de conflictos

```text
Seguridad / integridad real del backend
→ estado persistido real
→ flujo funcional maestro
→ arquitectura técnica
→ UI/UX
→ Stitch
→ roadmap
```

Ejemplos:

- Stitch nunca puede inventar un estado que no exista en el flujo/dominio.
- UI nunca puede llamar “protegido” a un pago en efectivo.
- Roadmap no puede marcar HECHO algo que Testing/Release todavía no validó.
- Frontend no puede habilitar una transición que RLS/RPC prohíbe.
- Un mock visual no se convierte en funcionalidad real por aparecer en Stitch.

---

# 3. Vocabulario canónico

## Roles

```text
Cliente
Proveedor
Admin
Super Admin
Scout
Hugo
Academia UGO
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

`pago_protegido` es un estado/condición aplicable a métodos electrónicos con custodia; no es requisito universal para efectivo.

Excepciones:

```text
cancelado · disputado · reembolsado
```

## Proveedor

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

## Pagos

Electrónico:

```text
pendiente → autorizado → retenido/protegido
→ liberación pendiente → liberado/pagado
```

Efectivo:

```text
seleccionado → presencial pendiente → servicio habilitado
→ proveedor confirma recepción → registrado
```

Regla absoluta: **efectivo no tiene custodia electrónica de UGO**.

---

# 4. Contrato transversal de confianza

Toda función debe contribuir al menos a uno de estos pilares:

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

UGO Shield es la representación UX de estas señales, no un producto financiero independiente ni una promesa universal de cobertura.

---

# 5. Contrato transversal de UI/UX

```text
Estado → contexto → próxima acción
```

Toda superficie conectada a datos:

```text
loading · loaded · empty · error/retry · offline/degraded
```

Toda mutación:

```text
idle → submitting → success / error + recovery
```

Mobile reference: `390×844`; rango principal `360–430`; targets táctiles `≥48px`; safe areas obligatorias. Desktop debe ser aplicación web real, no teléfono estirado.

Design language: **Kinetic Trust**. Fuente de tokens: `src/mvp/ugo-design-system.css`.

---

# 6. Contrato Cliente ↔ Proveedor

Una solicitud debe producir una oportunidad mediante el mismo servicio/identificador de dominio.

```text
Cliente crea solicitud + evidencia previa
→ matching genera oferta/oportunidad
→ Proveedor ve descripción + evidencia autorizada
→ acepta/rechaza
→ asignación única
→ ambos observan el mismo servicio
```

No crear estados Cliente y Proveedor independientes que puedan divergir.

---

# 7. Evidencias

Dos dominios obligatoriamente separados:

```text
Evidencia de solicitud
  antes del match, explica el trabajo a realizar

Evidencia operacional
  Antes / Durante / Después de la ejecución
```

Ambos usan Storage privado, RLS y signed URLs. Los guards críticos de inicio/cierre deben terminar en backend/RPC.

---

# 8. Ampliar servicio

Categoría: **Mejoras de flujo de trabajo**.

```text
Cliente o Proveedor propone
→ descripción + tiempo + costo
→ Cliente aprueba/rechaza
→ registro inmutable/auditable
→ reconciliación del pago
→ continúa servicio
```

Nunca alterar silenciosamente un pago electrónico ya protegido.

---

# 9. Hugo

Hugo es una capacidad contextual transversal, no una aplicación paralela.

Cliente: descubrimiento, explicación, ayuda y soporte.  
Proveedor: Asistente de Trabajo antes/durante/después.  
Admin: asistencia operacional y de interpretación autorizada.

Hugo no puede saltarse permisos, estados, pagos, RLS ni decisiones humanas críticas.

---

# 10. Scout

Scout es una **guía de acción**:

```text
Dato → interpretación → recomendación → acción → resultado
```

Debe cubrir oportunidades, tendencias, gaps de proveedores, campañas, conversión, calidad y alertas. Debe consumir datos agregados/seguros y minimizar PII.

---

# 11. Academia UGO

Academia forma parte del loop de calidad:

```text
incidencia/gap Scout/calidad
→ diagnóstico
→ formación
→ evaluación/certificación
→ mejora del perfil
→ mejores oportunidades
→ nueva medición
```

No debe quedar desconectada de reputación, calidad y oportunidades.

---

# 12. Admin / Super Admin

Admin opera excepciones y decisiones. Super Admin gobierna reglas del sistema.

```text
Admin: operación → personas → finanzas → disputas → calidad
Super Admin: permisos → configuración → matching → integraciones
             → feature flags → auditoría → estrategia
```

Toda acción privilegiada requiere autorización backend. La visibilidad de UI no equivale a permiso.

---

# 13. Contrato técnico

```text
React/TypeScript/Vite
→ flows por rol
→ servicios/adapters
→ Supabase RLS/RPC/Realtime/Storage
→ Vercel API para secretos/integraciones
```

Reglas:

- `main` es la integración vigente;
- no crear aplicaciones paralelas por rol;
- no crear clientes Supabase arbitrarios por componente;
- no exponer secretos/service role al browser;
- Realtime refleja DB;
- mutaciones críticas atómicas/idempotentes;
- migraciones versionadas;
- Stitch sólo aporta diseño.

---

# 14. Contrato de calidad

Estado documental de una función:

```text
IMPLEMENTADO ≠ VALIDADO ≠ RELEASED
```

Roadmap usa:

- `✅ HECHO` únicamente cuando está integrado y su validación requerida está satisfecha;
- `🟡 PARCIAL` cuando existe pero falta build/E2E/RLS/UX/release;
- `⬜ PENDIENTE` cuando todavía no existe/cierra;
- `⛔ BLOQUEADO` cuando depende de un tercero o decisión.

P0 nunca puede cerrarse sólo por existencia de código.

---

# 15. Definition of Done ecosistémica

Una función transversal está DONE cuando:

```text
flujo funcional definido
+ UI/UX compatible
+ contrato técnico correcto
+ datos/RLS/RPC correctos
+ Realtime/Storage si aplica
+ happy/error/offline
+ responsive/accesibilidad
+ build/TypeScript
+ E2E del tramo
+ deploy/CI verificado o estado explícito
+ roadmap actualizado
```

---

# 16. Ciclo de cambio documental

Todo cambio importante debe seguir:

```text
Idea
→ UGO_ECOSISTEMA_FLUJO
→ UI/UX si afecta experiencia
→ Arquitectura si afecta fronteras
→ Data/Backend si afecta persistencia/seguridad
→ Stitch si requiere diseño/prototipo
→ Testing/Release define aceptación
→ Roadmap registra estado/prioridad
```

No es obligatorio editar los siete en cada commit; sí todos los que sean autoridad del cambio.

---

# 17. Contrato de referencias

Los documentos maestros deben referirse entre sí mediante nombres canónicos y evitar duplicar grandes especificaciones. Cuando un detalle pertenezca a otro maestro, resumir el contrato y enlazar conceptualmente al documento autoridad.

La documentación histórica, Penpot/Stitch inventories y documentos de funciones específicas son **evidencia/referencia**, no autoridad superior a estos maestros.

---

# 18. P0 común actual

```text
1. Build/TypeScript de main actual
2. RLS/guards backend de evidencia y ampliaciones
3. Cliente: evidencia previa integrada en solicitud
4. Proveedor: contrato serviceId y oportunidad E2E
5. Pago: timeline + cierre consciente del método
6. Retirar Provider legacy como salida operacional
```

Todos los maestros deben tratar este orden como baseline hasta que `UGO_ROADMAP_MASTER.md` registre su cierre validado.

---

# 19. Regla final

**UGO es un solo ecosistema con un solo dominio operacional y múltiples experiencias por rol.**

Producto, diseño, código, datos, IA, pagos, pruebas y roadmap deben describir la misma realidad desde perspectivas distintas.