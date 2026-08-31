# U.G.O. — Configuración Mercado Pago (Etapa 2)

Los valores secretos nunca se documentan en este repositorio. Configuralos únicamente en Vercel → Project Settings → Environment Variables.

## Proyecto Supabase activo

La aplicación MVP usa el proyecto indicado por `.env.example`:

```text
https://trfsjuseqjxlhrxuvdsm.supabase.co
```

No mezclar estas credenciales con proyectos Supabase anteriores.

## Variables de Vercel

### Mercado Pago

```text
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
APP_URL=https://TU-DOMINIO-DE-UGO
```

`APP_URL` debe ser la URL pública HTTPS que recibe los callbacks y el webhook. Si no está definida, el backend usa automáticamente la URL del deployment de Vercel.

### Supabase server-side

```text
SUPABASE_URL=https://trfsjuseqjxlhrxuvdsm.supabase.co
SUPABASE_SERVICE_KEY=
```

### Supabase frontend

```text
VITE_SUPABASE_URL=https://trfsjuseqjxlhrxuvdsm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Migración requerida

Antes de probar checkout, aplicar:

```text
supabase/migrations/20260831_stage2_mercado_pago.sql
```

La migración es aditiva e idempotente. Agrega únicamente metadata de Mercado Pago e índices a `public.pagos`.

## Flujo Etapa 2

1. Cliente crea el pedido.
2. Hugo hace matching y envía ofertas.
3. Proveedor acepta la misión.
4. Cliente abre Mercado Pago desde U.G.O.
5. `/api/pagos/crear` obtiene monto, moneda, cliente y proveedor directamente desde Supabase; no confía esos valores al navegador.
6. Mercado Pago notifica `/api/pagos/webhook`.
7. El webhook vuelve a consultar el pago en Mercado Pago y verifica monto + moneda.
8. Solo un pago aprobado y consistente cambia la bóveda a `retenido`.
9. Recién entonces el proveedor puede iniciar la misión desde la UI.
10. Al terminar, el cliente aprueba y el RPC existente libera el pago.

## Endpoints

- `POST /api/pagos/crear` — crea/reutiliza el checkout del servicio autenticado.
- `GET|POST /api/pagos/webhook` — procesa notificaciones de Mercado Pago de forma idempotente.
- `POST /api/retiros/solicitar` — retiro del proveedor (flujo separado).

## Prueba recomendada

Usar credenciales y usuarios de prueba oficiales de Mercado Pago. Probar primero en Preview antes de fusionar a `main`.
