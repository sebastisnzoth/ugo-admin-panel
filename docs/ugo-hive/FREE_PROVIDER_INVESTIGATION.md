# FreeLLMAPI y OpenClaw — investigación de proveedores gratuitos

**Fecha:** 2026-11-28 · **Rama:** `arena/6f95c7c3-ugo-admin-panel` · **Coste:** USD 0
**Regla:** nada se abre por documentación. Una ruta se habilita cuando existe evidencia
verificable de que es gratuita, está pineada y no factura.

---

## 1. Hechos comprobados en este repositorio y en la sesión

| Hecho | Dónde se ve |
|---|---|
| FreeLLMAPI es un proyecto **separado** (`sebastisnzoth/freellmapi`, PR #1) con un plan de Render Free | `docs/UGO_HIVE_MASTER_DISENO_2026-10-18.md` §1150 |
| El backend `ugo-hive-freeapi.onrender.com` **no es verificable** desde este entorno (sin salida a `onrender.com`) | `docs/ugo-hive/HIVE_EXECUTION_STATUS_2026-11-27.md` §0 |
| La política revisada **cierra** `freellmapi`: su pinning proveedor/modelo no es verificable | `supabase/functions/ugo-hive-model-router/policy.mjs` (`if(route.provider==='freellmapi') return false`) |
| OpenRouter se acepta **sólo** con modelo `:free`, precios en cero, evidencia de facturación y aprobación de menos de 1 hora | `policy.mjs` + `hive/worker/providers.mjs` |
| **OpenClaw no tiene endpoint ni contrato documentado** en este repositorio | búsqueda en `docs/`, `supabase/`, `scripts/`: sólo menciones de estado «CERRADO» |

Conclusión honesta: hoy **no existe ninguna ruta de inferencia gratuita verificada**. Lo que
sí existe es el mecanismo para abrirla en cuanto haya evidencia, y una ruta **local** que
permite probar el camino completo sin red externa ni coste.

---

## 2. Lo implementado ahora

### 2.1 Proveedor `local` (loopback obligatorio)

`hive/worker/providers.mjs` gana un adaptador `local` que habla con un servidor en la propia
máquina —FreeLLMAPI o OpenClaw ejecutados localmente— con tres candados:

1. **Sólo loopback**: `http(s)://127.0.0.1`, `localhost` o `[::1]`. Un host remoto se rechaza
   con `LOCAL_PROVIDER_NOT_LOOPBACK`; si apunta a internet, no es «local».
2. **Aprobación explícita**: `HIVE_LOCAL_PROVIDER_APPROVED=APROBADO`. Sin ella,
   `LOCAL_PROVIDER_NOT_APPROVED` y no se llama a nadie.
3. **Coste declarado**: el servidor local debe devolver `cost` (o `usage.cost`). Si no lo
   hace, el Judge rechaza con `COST_UNVERIFIED` (ver §3).

Contrato con el servidor local:

```http
POST /api/complete
{ "prompt": "…", "model": "local/free", "max_tokens": 512 }

200 OK
{ "text": "…", "model": "local/free", "cost": 0,
  "usage": { "prompt_tokens": 44, "completion_tokens": 8 } }
```

Probado con un servidor HTTP real en `tests/hive/worker-unit.test.mjs`
(camino feliz, coste ausente, host remoto, sin aprobación).

### 2.2 Por qué FreeLLMAPI remoto sigue cerrado

Aunque el endpoint respondiera, `policy.mjs` lo rechaza porque **no puede demostrar el
pinning**: FreeLLMAPI unifica identificadores de modelo y puede cambiar de proveedor upstream
sin avisar. Un `cost: 0` declarado por el propio servicio no demuestra que el proveedor real
no cobre. Abrirlo requiere un contrato que hoy no existe.

### 2.3 Qué haría falta para abrir OpenClaw

Sin endpoint ni contrato en el repositorio, lo mínimo verificable:

- URL HTTPS con TLS válido y `redirect: 'error'`.
- Modelo identificado de forma estable (sin alias) y **prueba** de que no hay fallback.
- Declaración de coste por respuesta (`cost` numérico) y política de facturación publicada.
- Evidencia de facturación (`billing_evidence`) y aprobación con vencimiento < 1 h, como
  exige `eligibleRoute`.
- Prueba de que el `usage` reportado coincide con el real (una llamada de control).

Hasta entonces: `OPENCLAW_NOT_APPROVED` / `NO_VERIFIED_FREE_ROUTE`.

---

## 3. Coste: dejar de asumir `billed_usd = 0`

Antes el worker **asumía** coste 0. Ahora:

| Estado | Significado | Judge |
|---|---|---|
| `VERIFIED_ZERO` | el proveedor devolvió un coste numérico igual a 0 | ✅ puede aprobar |
| `COST_NON_ZERO` | el proveedor devolvió un coste > 0 | ⛔ `COST_NOT_ZERO` |
| `UNVERIFIED` | no devolvió coste, o no es numérico/negativo | ⛔ `COST_UNVERIFIED` |

Se guarda en el resultado del trabajo: `judge.cost = { state, value, source }`, y
`cost_usd` sólo vale `0` cuando el estado es `VERIFIED_ZERO`. Evidencia en contra incluida:
con un proveedor que **no** declara coste, la tarea queda `FAILED` y `result = null`
(`docs/ugo-hive/evidence/hive-console-api.json` → `cost_verification`).

**Consecuencia operativa:** OpenRouter sólo podrá usarse cuando devuelva `usage.cost = 0`
para el modelo `:free` aprobado. Si no lo devuelve, el worker no ejecuta. Eso es deliberado:
«gratis» es un dato verificable, no una suposición.

---

## 4. Cómo probar el camino completo sin coste

```bash
# servidor local de pruebas (determinista, sin red externa)
node -e "import('./tests/hive/fixtures/mock-provider.mjs').then(async m=>{
  const s=await m.startMockProvider({path:'/api/complete'});
  console.log(JSON.stringify({url:s.url})); setInterval(()=>{},1000)})"

export HIVE_WORKER_PROVIDER=local
export HIVE_LOCAL_PROVIDER_URL=http://127.0.0.1:<puerto>
export HIVE_LOCAL_PROVIDER_APPROVED=APROBADO
export HIVE_WORKER_MAX_JOBS=1 HIVE_WORKER_MAX_ITERATIONS=1
node hive/worker/worker.mjs --once
```

## 5. Veredicto

- **Proveedores pagados: 0 configurados, 0 posibles por código.**
- **Ruta local: implementada y probada** (loopback + aprobación + coste declarado).
- **FreeLLMAPI remoto: CERRADO** por pinning no verificable (política del repositorio).
- **OpenClaw: CERRADO** por ausencia de endpoint y contrato.
- **Coste real: no asumido.** Se exige declaración; sin ella no hay PASS.
- **USD gastados en esta investigación: 0.**
