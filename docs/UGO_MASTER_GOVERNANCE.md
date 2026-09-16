# UGO — Master Governance

**Versión:** 2.3 · 16 de septiembre de 2026  
**Estado:** contrato superior de compatibilidad  
**Rama de verdad:** `main`

## 1. Autoridades

- `UGO_MASTER_INDEX.md`: visión transversal.
- `UGO_DEVELOPMENT_MASTER.md`: proceso de ejecución.
- `UGO_DEVELOPMENT_READINESS_MASTER.md`: verdad medible hacia primer cliente.
- `UGO_ECOSISTEMA_FLUJO.md`: producto/journeys.
- `UGO_UIUX_MAESTRO.md` + usabilidad: experiencia.
- `UGO_ARQUITECTURA_TECNICA_MASTER.md`: fronteras técnicas.
- `UGO_DATA_BACKEND_MASTER.md`: persistencia, RLS, dinero e integridad.
- `UGO_TESTING_RELEASE_MASTER.md`: evidencia, gates y release.
- `UGO_ROADMAP_MASTER.md`: prioridades y estado.
- `AGENTS.md`: protocolo de agentes.

## 2. Jerarquía de conflicto

```text
integridad ejecutable
→ estado persistido real
→ Governance
→ Producto/Flujo
→ Data/Backend
→ Arquitectura
→ UI/UX
→ Roadmap
→ snapshots históricos
```

Stitch/mock/diseño nunca inventan estado ni permiso.

## 3. Invariantes

### Servicio único
Cliente, Proveedor y Admin comparten el mismo `serviceId` y estado persistido.

### Multi-pedido
Un cliente puede mantener múltiples pedidos activos/futuros independientes. No existe una regla global “un solo servicio activo por cliente”. La idempotencia del mismo draft no puede bloquear pedidos intencionalmente distintos.

### Asignación única
Aceptar una oportunidad es atómico y resistente a doble aceptación.

### Lifecycle

```text
borrador → buscando → ofrecido → asignado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones: `cancelado`, `disputado`.

### Estado proveedor

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

No mezclarlo con el lifecycle del servicio.

### Dinero
Pagos son un dominio propio. Efectivo no es custodia electrónica. Un cambio de alcance con costo debe quedar aprobado y reconciliado según el método antes de cerrar.

### Evidencia
Ownership, estado temporal y objeto Storage real deben coincidir; metadata sola no prueba existencia.

## 4. Madurez de entrega

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

Una etapa sólo puede declararse con evidencia exacta para la revisión correspondiente.

Reglas:

- CI de otro SHA no valida el actual.
- HTTP 200 no valida el journey.
- runtime verificado no demuestra que el mismo código esté publicado en otro canal.
- una publicación vieja no representa `main`.

## 5. Readiness

`public.development_checklist` es la fuente privada/autorizada de readiness en UGO TEST. El panel `/?app=development` expone únicamente una representación pública sanitizada y read-only.

Sólo `approved` suma avance verificado. Una regresión real obliga a degradar el item correspondiente; no se conserva `approved` por conveniencia.

## 6. Centinela

Centinela es observabilidad TEST, no autoridad de producto.

Debe:

- reportar fallas reales por rol/acción/build;
- sanitizar contacto y metadata;
- clasificar acciones críticas del lado servidor;
- distinguir incidente actual/histórico;
- mantener privados stack, serviceId y metadata sensible en el feed público.

No debe:

- cambiar automáticamente el checklist;
- aprobar readiness;
- exponer secretos o datos personales;
- sustituir E2E/QA.

## 7. Desarrollo público

`?app=development` es deliberadamente público y sin login durante esta fase, pero sólo lectura. Esta excepción no convierte tablas privadas ni acciones administrativas en públicas.

Separación obligatoria:

```text
lectura pública sanitizada
≠ escritura checklist
≠ evidencia privada
≠ administración
```

## 8. Git

Para este repo, `main` es la única rama de trabajo autorizada. Los agentes deben verificar HEAD antes de escribir y actualizarlo sólo por fast-forward. Si existe drift concurrente, reconstruir el cambio sobre el HEAD nuevo.

No crear ramas de rutina ni forzar historia.

## 9. Release

Publicar es una acción separada de integrar. Un commit puede quedar `IMPLEMENTED`/`CI VALIDATED` sin estar `PUBLISHED`.

No disparar deploys innecesarios para cambios que no necesitan publicación runtime. Toda publicación debe identificar revisión, entorno/canal y smoke.

La ruta de hosting retirada no forma parte de readiness ni release activo.

## 10. Prioridad

```text
P0 seguridad · datos · auth · dinero · integridad core · primer cliente
P1 journey principal · operación · UX crítica
P2 optimización · automatización
P3 expansión · polish
```

## 11. Regla final

**Ante conflicto, gana la opción que preserve una sola verdad, integridad, auditabilidad y evidencia por etapa. Lo público puede observar; sólo los contratos autorizados pueden mutar.**
