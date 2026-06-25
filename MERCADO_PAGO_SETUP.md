# CONFIGURAR VARIABLES DE ENTORNO EN VERCEL

Estas son las variables que debes agregar en tu proyecto Vercel:

## 1. Ve a Vercel Dashboard
https://vercel.com/dashboard

## 2. Selecciona el proyecto "ugo-admin-panel"

## 3. Abre Settings → Environment Variables

## 4. Agrega estas variables:

### Mercado Pago (TEST)
```
MERCADO_PAGO_PUBLIC_KEY=TEST-ac916520-e8c0-4ab0-9ce8-089d9519b09f
MERCADO_PAGO_ACCESS_TOKEN=TEST-5574566683215419-041913-8fe01d1c0030513b8692fdab7eeee2fa-43150129
MERCADO_PAGO_RECEIVER_ID=1234567890
```

### Supabase (ya existen)
```
VITE_SUPABASE_URL=https://byajcqrgetloavrgyqak.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzA5NTMsImV4cCI6MjA5NzA0Njk1M30.vkeb10BBuu06mOrMdOw1K3SBhTbl02KbOUp6lSOhRDs
SUPABASE_URL=https://byajcqrgetloavrgyqak.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpjcXJnZXRsb2F2cmd5cWFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ3MDk1MywiZXhwIjoyMDk3MDQ2OTUzfQ.xc3pEH-Og6VxIDNlKMK1hQIqPpT40Xjb8-xqDGKj3bU
```

## 5. Aplica los cambios

Una vez guardadas las variables, tu app se redeployará automáticamente.

---

## TESTING (Mercado Pago Sandbox)

Usa estas tarjetas de prueba:

### Aprobada:
```
Número: 4111 1111 1111 1111
Vencimiento: 11/25
CVV: 123
```

### Rechazada:
```
Número: 4000 0000 0000 0002
Vencimiento: 11/25
CVV: 123
```

### Dinero en Cuenta (para retiros):
```
Número: 5031 7557 3453 0604
Vencimiento: 11/25
CVV: 123
```

---

## ENDPOINTS LISTOS PARA USAR

Una vez desplegado, estos endpoints funcionarán:

- **POST /api/pagos/crear** → Iniciar pago
- **GET /api/pagos/webhook** → Confirmación de Mercado Pago
- **POST /api/retiros/solicitar** → Proveedor solicita retiro
