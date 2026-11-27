# UGO Hive ⇄ UGO Arena — aislamiento verificado

**Ámbito:** `sebastisnzoth/ugo-admin-panel`, entorno UGO TEST (`tmossnqfwfwjrtzwcbmm`).
**Coste:** USD 0. Sin base de datos, sin red, sin despliegues.
**Última verificación:** 2026-11-27 (ver `evidence/isolation-audit.json`).

## 1. Qué garantiza este documento

Arena debe seguir funcionando si Hive se desconecta, falla o agota sus cuotas. Esta
verificación lo comprueba de forma **estática y reproducible**, no por opinión:

```bash
node scripts/hive/isolation-audit.mjs                 # consola
node scripts/hive/isolation-audit.mjs --out evidence/hive-isolation-audit.json
node --test tests/hive/isolation-audit.test.mjs       # reglas del gate
```

El gate también corre en CI: `.github/workflows/hive-independence-guard.yml`
(`workflow_dispatch` + `pull_request` con filtro de rutas; sin secretos).

## 2. Reglas

| Regla | Qué impide | Por qué |
|---|---|---|
| `HIVE_IN_BOOT_PATH` | que `index.html`, `src/main.tsx` o `src/App.tsx` referencien Hive | Arena debe arrancar sin Hive |
| `HIVE_CALL_OUTSIDE_REVIEW` | que cualquier módulo no revisado haga red hacia Hive | un solo punto de contacto, revisado |
| `HIVE_CALL_UNBOUNDED` | que el módulo revisado llame a Hive sin abort/timeout acotado | ninguna conexión queda abierta |
| `HIVE_POLLING` | actividad de Hive por intervalo | Hive es event-driven; inactivo = sin tráfico |
| `SECRET_IN_CLIENT` | credenciales privilegiadas en el bundle del navegador | no hay `service_role` en el cliente |
| `HIVE_REFERENCE_UNREVIEWED` | referencias a Hive fuera del catálogo revisado | cada acoplamiento es una decisión explícita |

Módulos autorizados (allowlist explícita en `scripts/hive/isolation-audit.mjs`):

- `src/mvp/HiveConsole.tsx` — única superficie con red hacia Hive. Sección Super Admin
  únicamente (`AdminGate.tsx` exige `tipo==='superadmin'`), una sola petición por montaje,
  `AbortController` de 8 s y abort al desmontar. Sin polling.
- `src/mvp/hiveCatalog.ts` — datos canónicos, sin red.

## 3. Estado observado

- 333 archivos de runtime escaneados (`src`, `api`, `index.html`).
- Archivos que referencian Hive: **2**, ambos de la allowlist.
- Hallazgos: **0**. Veredicto: **PASS**.
- `api/` y `src/server/` son código de servidor: la regla de credenciales no aplica ahí
  (ya usan sus propias claves privilegiadas y no se envían al navegador).

## 4. Límites explícitos (lo que este gate NO prueba)

1. No ejecuta Arena en tiempo de ejecución. La **prueba de caída total de Hive**
   (chaos test en TEST, con Hive apagado y recorrido completo cliente/proveedor/admin)
   sigue **PENDIENTE**: requiere Hive TEST accesible para apagarlo, y el repositorio
   `ugo-hive` no está accesible con las credenciales de esta sesión (HTTP 403).
2. No detecta fallos de DNS, TLS, cuotas de plataforma ni cold starts reales.
3. Detecta únicamente los nombres de credencial listados en `SECRET_TOKENS`.
4. No acredita que los agentes de Hive ejecuten tareas: eso exige runtime real.

Ninguno de estos límites se resuelve declarando el gate como "E2E".

## 5. Rollback

Todos los cambios son aditivos y locales a TEST:

- `scripts/hive/isolation-audit.mjs` (nuevo, sin consumidores en runtime).
- `tests/hive/isolation-audit.test.mjs` (nuevo).
- `.github/workflows/hive-independence-guard.yml` (nuevo; se desactiva borrándolo).
- `src/mvp/hiveCatalog.ts` + `src/mvp/HiveConsole.tsx` (UI Hive: abort acotado y catálogo).

Revertir: `git revert <sha>` sobre la rama, sin `reset` ni `force push`. No hay migraciones
aplicadas, ni secretos, ni datos modificados: el rollback no puede perder datos.
