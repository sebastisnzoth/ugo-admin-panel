# UGO — Master Index

**Versión:** 2.8 · 16 de septiembre de 2026  
**Estado:** puerta de entrada única al sistema maestro UGO  
**Rama de verdad:** `main`

> UGO mantiene una sola realidad de producto. Los maestros dividen responsabilidades, no crean sistemas paralelos.

## 1. North Star

```text
Necesidad real
→ proveedor adecuado
→ contratación clara
→ ejecución trazable
→ resultado aprobado
→ cobro correcto
→ reputación
→ repetición
```

Métrica principal: **servicios confiables completados dentro de UGO**.

Principio de producto: **Un pedido. Un profesional. Sin vueltas.** Esto significa un profesional por pedido, no un único pedido activo por cliente.

## 2. Autoridades maestras

```text
Nivel 0  docs/UGO_MASTER_GOVERNANCE.md
Nivel 1  docs/UGO_DEVELOPMENT_MASTER.md
Nivel 1.2 docs/UGO_DEVELOPMENT_READINESS_MASTER.md
Nivel 1.5 docs/UGO_AI_AGENT_SYSTEM_MASTER.md
Coord.   docs/UGO_DUAL_IMPLEMENTATION_MASTER.md
Nivel 2  docs/UGO_ECOSISTEMA_FLUJO.md
Nivel 3  docs/UGO_UIUX_MAESTRO.md
         docs/UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md
         docs/UGO_UIUX_STITCH_MASTER.md
         docs/UGO_CLIENTE_CONVERSACIONAL_INTERACTIVO_MASTER.md
Nivel 4  docs/UGO_ARQUITECTURA_TECNICA_MASTER.md
Nivel 5  docs/UGO_DATA_BACKEND_MASTER.md
Nivel 6  docs/UGO_TESTING_RELEASE_MASTER.md
Nivel 7  docs/UGO_ROADMAP_MASTER.md
Handoff  docs/UGO_AGENT_HANDOFF.md
Agentes  AGENTS.md
```

Brief específico del proveedor: `docs/UGO_PROVIDER_SIMPLE_FLOW_PROMPT.md`.

`docs/UGO_DUAL_IMPLEMENTATION_MASTER.md` coordina la competencia autorizada entre **UGO A** (`ugo-admin-panel`) y **UGO B** (`UGO-PRODUCCION`). Esa competencia es de implementación/UX, no una autorización para duplicar backend, reglas de negocio o verdad persistida.

## 3. Cadena de verdad

```text
integridad ejecutable
→ estado persistido real
→ maestros
→ roadmap/checklist
→ UI visible
```

No se corrige una contradicción haciendo que la UI finja un estado inexistente.

## 4. Madurez canónica

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

- `IMPLEMENTED`: integrado en `main`.
- `CI VALIDATED`: gates automatizados aplicables verdes para ese SHA.
- `RUNTIME VALIDATED`: prueba real en UGO TEST/runtime/dispositivo según el caso.
- `PUBLISHED`: esa revisión está realmente disponible en el canal objetivo.

No usar “listo”, “hecho”, “validado” o “publicado” intercambiablemente.

## 5. Readiness del primer cliente

La fuente viva es `public.development_checklist` en Supabase TEST. La superficie `/?app=development` es **pública, sin login y sólo lectura**, alimentada por vistas sanitizadas. Las tablas base y evidencia privada permanecen protegidas.

Estados del checklist:

```text
pending
in_progress
implemented
validated
blocked
failed
approved
```

Sólo `approved` cuenta para el porcentaje de readiness. `validated` significa validación técnica aplicable; `approved` significa que el criterio de aceptación requerido quedó demostrado. `PUBLISHED` sigue siendo una etapa de release separada salvo items de release explícitos.

## 6. Centinela / Sentinel

Centinela observa el runtime TEST para detectar fallas reales sin convertir observabilidad en una segunda autoridad.

Contrato:

- sanitiza mensajes y metadata;
- separa incidentes del build actual de los históricos;
- clasifica acciones críticas server-side;
- instrumenta matching/cancel/status de Cliente y operaciones críticas de Proveedor;
- puede retener de forma segura una cola anónima local hasta poder reportar;
- el feed público omite datos sensibles;
- **nunca auto-aprueba ni cambia el readiness checklist**.

Un incidente P0 del build actual invalida cualquier narrativa de “todo listo” hasta investigarlo.

## 7. Contrato transversal de servicio

```text
borrador → buscando → ofrecido → asignado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones: `cancelado`, `disputado`.

`serviceId` es la identidad transversal. Chat, tracking, pago, evidencia, ampliaciones, disputa y cancelación deben actuar sobre el `serviceId` exacto.

Un cliente puede tener A+B+C pedidos coexistiendo; una mutación de B no puede tocar A/C.

## 8. Proveedor simple adelante, trazable atrás

Happy path visible:

```text
Ver problema
→ Aceptar
→ Estoy yendo
→ Llegué / llegada automática
→ Empezar trabajo
→ Listo
```

UGO conserva detrás los guards de pago, estado, evidencia, permisos y aprobación.

## 9. Matching y recuperación

Nunca existe un callejón sin salida:

```text
Buscando
→ proveedor encontrado
O → sin proveedor todavía
O → timeout/error/offline
O → retry
O → cancelar
```

Cancelar debe persistir y converger en las superficies participantes.

## 10. Chat P0

Debe demostrar por un mismo `serviceId`:

- Cliente → Proveedor realtime;
- Proveedor → Cliente realtime;
- rehidratación después de reload/reconnect;
- respuestas rápidas operativas;
- bloqueo de teléfonos, WhatsApp, emails, links y contacto off-platform;
- cero mezcla entre servicios.

## 11. Git y release

`main` es la única rama de trabajo autorizada para este proyecto. No crear ramas nuevas por rutina.

La publicación es manual/deliberada y puede quedar detrás de `main`. Un deploy o APK debe registrar la revisión que realmente contiene. No inferir publicación desde un commit.

## 12. Implementación dual A ↔ B

La implementación dual es una estrategia de entrega controlada, no un fork del producto:

```text
UGO A: integración/madurez actual sigue avanzando
UGO B: experiencia AI Studio se convierte en flujo real
ambos: mismo contrato Supabase TEST + mismos criterios E2E
```

Reglas:

- ninguno frena al otro;
- cada solución demostrada puede transferirse al otro repo;
- UGO B no puede declararse funcional con mocks/local state en el camino crítico;
- UGO A no conserva una UX inferior sólo por antigüedad si B demuestra una mejora compatible;
- la comparación usa el mismo E2E, móvil y costo directo $0;
- Supabase PROD permanece fuera del experimento hasta release autorizado.

## 13. Regla final

**UGO cuida la confianza cumpliendo. Primero cerrar y demostrar Cliente ↔ Proveedor ↔ Admin; después ampliar. Código, checklist, Centinela y publicación deben decir exactamente qué está implementado, qué pasó CI, qué fue probado en runtime y qué está realmente publicado. La competencia A ↔ B puede mejorar la implementación, pero nunca crear dos verdades de producto.**
