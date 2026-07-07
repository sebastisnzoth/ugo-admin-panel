# CONFIGURAR VARIABLES DE ENTORNO EN VERCEL

Este documento indica QUÉ variables necesita el proyecto. Los VALORES reales
nunca se documentan acá — viven únicamente en Vercel → Settings →
Environment Variables. Este repo es público; ningún secreto debe aparecer
en ningún archivo, ni siquiera de testing.

## 1. Ve a Vercel Dashboard
https://vercel.com/dashboard

## 2. Selecciona el proyecto "ugo-admin-panel"

## 3. Abre Settings → Environment Variables

## 4. Variables requeridas (obtené los valores reales desde el proveedor
## correspondiente o desde quien administre las credenciales del proyecto):

### Mercado Pago
```
MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_RECEIVER_ID=
```

### Supabase
```
VITE_SUPABASE_URL=https://byajcqrgetloavrgyqak.supabase.co
VITE_SUPABASE_ANON_KEY=            # usar la publishable key (sb_publishable_...)
SUPABASE_URL=https://byajcqrgetloavrgyqak.supabase.co
SUPABASE_SERVICE_KEY=              # secret key (sb_secret_...)
SUPABASE_SERVICE_ROLE_KEY=         # mismo valor que SUPABASE_SERVICE_KEY —
                                    # el código usa ambos nombres en distintos
                                    # endpoints, hay que setear los dos
```

## 5. Aplica los cambios

Una vez guardadas las variables, tu app se redeployará automáticamente.

---

## TESTING (Mercado Pago Sandbox)

Usá las tarjetas de prueba oficiales de Mercado Pago para tu país
(ver documentación de Mercado Pago — no se listan acá para evitar que
queden desactualizadas o se confundan con credenciales reales).

---

## ENDPOINTS LISTOS PARA USAR

Una vez desplegado, estos endpoints funcionarán:

- **POST /api/pagos/crear** → Iniciar pago
- **GET /api/pagos/webhook** → Confirmación de Mercado Pago
- **POST /api/retiros/solicitar** → Proveedor solicita retiro
