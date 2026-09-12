# UGO — CODEX.md · Protocolo de ejecución para Codex

**Rama de verdad:** `main`  
**Autoridad superior:** `AGENTS.md`

## Objetivo

Este archivo existe para que Codex pueda entrar al repositorio UGO desde terminal o entorno cloud, recuperar contexto operativo sin depender de prompts largos y continuar el trabajo de forma autónoma.

Codex no reemplaza `AGENTS.md`. Debe obedecerlo. Este archivo sólo define cómo tomar el relevo, ejecutar y dejar un handoff legible para el siguiente agente.

## Entrada obligatoria

Antes de tocar código, Codex debe leer, en este orden proporcional al alcance:

```text
AGENTS.md
→ CODEX.md
→ docs/UGO_AGENT_HANDOFF.md
→ UGO_ROADMAP_MASTER.md
→ docs/UGO_AUDIT_20260912.md
→ maestros/Skills afectados
→ realidad actual de main
```

Pregunta permanente:

> **¿Qué impide hoy que esto tenga su primer cliente real?**

La respuesta gobierna la prioridad P0/P1.

## Modo autónomo

Una orden como:

```text
seguí según AGENTS.md y CODEX.md
```

autoriza a Codex a encadenar, sin pedir confirmaciones rutinarias:

```text
auditar
→ elegir el siguiente P0/P1 con dependencia satisfecha
→ implementar
→ probar
→ corregir
→ revalidar
→ actualizar handoff/roadmap si corresponde
→ commit
→ continuar con el siguiente bloque relacionado
```

No pedir permiso por archivo, test, refactor local, commit, documentación o corrección reversible dentro del alcance.

## Frenos reales

Codex debe detenerse sólo cuando avanzar requiera alguno de estos casos y no exista alternativa reversible segura:

- producción con efecto material o irreversible;
- dinero real, precios, comisiones o settlement;
- credenciales o permisos externos no disponibles;
- gasto o infraestructura paga;
- exposición sensible de datos/seguridad;
- operación destructiva;
- contradicción material entre maestros;
- ampliación de alcance hacia otro producto.

Cuando ocurra, no reportar sólo “bloqueado”. Escribir en `docs/UGO_AGENT_HANDOFF.md` exactamente:

```text
BLOCKED
qué falta
por qué bloquea
acción mínima del usuario
resultado esperado
qué retomar después
```

## Regla de repositorio

- trabajar sobre `main` salvo instrucción explícita distinta;
- no clonar otra copia por rutina;
- no usar `UGO Arena` para pruebas del flujo principal;
- no usar Supabase producción como entorno destructivo de test;
- no crear branch/proyecto Supabase pago sin aprobación humana;
- no inventar CI verde, deploy, migración aplicada ni E2E exitoso;
- distinguir siempre `IMPLEMENTED`, `VALIDATED`, `RELEASED`, `MEASURED`.

## Fuente de estado compartido

`docs/UGO_AGENT_HANDOFF.md` es el buzón operativo compartido entre ChatGPT/Codex y cualquier otro agente.

Al comenzar:
1. leerlo;
2. verificar que siga alineado con `main`;
3. si está desactualizado, corregirlo antes de usarlo como verdad.

Al terminar un bloque significativo:
1. actualizar `LAST COMPLETED`;
2. actualizar `CURRENT P0`;
3. registrar `BLOCKED` sólo si es real;
4. registrar evidencia de validación exacta;
5. dejar `NEXT` accionable;
6. incluir commits relevantes.

No convertir el handoff en diario largo. Debe ser breve, actual y ejecutable.

## Validación mínima

Usar gates reales del repo cuando el cambio los afecta:

```bash
npm run build
npm test
npm run lint
```

Para integración aislada Cliente ↔ Proveedor:

```bash
UGO_REQUIRE_ISOLATED_INTEGRATION=1 npm run test:integration
```

Sólo ejecutar ese harness si existen las seis variables `UGO_TEST_*` y el `UGO_TEST_SUPABASE_URL` NO corresponde a producción.

## E2E P0 canónico

El journey de referencia es:

```text
Cliente crea solicitud
→ matching
→ Proveedor acepta
→ pago válido
→ en_camino
→ llegado
→ evidencia Antes
→ en_progreso
→ ampliación opcional
→ evidencia Después
→ esperando_aprobacion
→ Cliente aprueba o disputa
→ cierre financiero
```

Invariantes:

- mismo `serviceId` transversal;
- backend/RPC/RLS autoridad de estados críticos;
- asignación atómica;
- pago y evidencia bloquean transiciones inválidas;
- ampliación conserva integridad financiera;
- Realtime rehidrata persistencia y no crea segunda verdad;
- retry/evento duplicado debe ser idempotente.

## Estado actual de referencia

No asumir que este bloque permanece vigente sin revisar `docs/UGO_AGENT_HANDOFF.md` y `UGO_ROADMAP_MASTER.md`.

A fecha de creación de este protocolo:

- harness RPC/RLS aislado ya existe;
- workflow manual aislado ya existe;
- protección contra producción ya existe;
- reembolso de ampliación está versionado pero su migración no debe darse por aplicada sin evidencia;
- convergencia Realtime fue endurecida en repo;
- evidencia previa del Cliente es opcional cuando no aporta valor;
- Vercel puede rechazar builds por rate limit; eso no equivale a fallo de código.

## Reporte de salida

Al terminar, el reporte debe usar exactamente este formato compacto:

```text
IMPLEMENTED
- ...

VALIDATED
- ...

RELEASED
- ...

BLOCKED
- none | detalle exacto

NEXT
- siguiente P0/P1 concreto

COMMITS
- <sha> <mensaje>
```

## Comando humano recomendado

Desde el repo, el usuario debería poder abrir Codex y decir sólo:

```text
Seguí con los P0 de UGO según AGENTS.md, CODEX.md y docs/UGO_AGENT_HANDOFF.md. No me preguntes salvo decisión crítica.
```

Eso debe ser suficiente para retomar el proyecto.