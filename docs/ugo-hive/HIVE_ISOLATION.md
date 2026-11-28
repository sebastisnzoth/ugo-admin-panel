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

## 5. Rollback (procedimiento verificado, no narrado)

**Corrección:** el procedimiento anterior —«`git revert <sha>`»— era incorrecto. El PR #633
tiene **tres** commits; revertir sólo `0af0912` deja el árbol a medias.

Procedimiento correcto y **verificado ejecutándolo**:

```bash
# 1. Confirmar el conjunto real de cambios y que el revert restaura el árbol base:
node scripts/hive/rollback-verify.mjs \
  --base d2fe61e9ecc85e491d3839cb6885d3802d9c06de \
  --head arena/6f95c7c3-ugo-admin-panel \
  --out docs/ugo-hive/evidence/rollback-verification.json

# 2. Revertir los tres commits (orden inversO, uno por commit):
git revert 0af0912060c6ec03b963c9d0a351639050cbc8ab \
           b1f7d9a9aab5113d9bf1a80d5ee9bed9c3d3dedd \
           67299aa7ed61dced17e4a0193f8cf53206fc7c2c
```

`rollback-verify.mjs` hace el revert completo en un *worktree* desechable y comprueba que
el árbol resultante es idéntico al commit base (`tree_restored: true`). Resultado actual:
**PASS · 3 commits · 12 archivos · árbol base restaurado**. Evidencia en
`docs/ugo-hive/evidence/rollback-verification.json`.

Si el PR llegara a fusionarse, el revert es sobre el commit de merge:
`git revert -m 1 <merge-sha>` (el verificador detecta merges y cambia el procedimiento).

Prohibido en cualquier caso: `reset --hard`, `force push`, borrado de datos.

Alcance del rollback: `scripts/hive/` (auditoría y verificación de rollback), `tests/hive/`,
`.github/workflows/hive-independence-guard.yml`, `hive/neon/` (preparación, **no aplicada**),
`src/mvp/hiveCatalog.ts` y `src/mvp/HiveConsole.tsx`. No hay migraciones aplicadas, ni
secretos, ni datos modificados: el rollback no puede perder datos de nadie.
