# UGO × Uber Direct — integración oficial

**Estado:** implementado en `main`; activación real pendiente de credenciales Uber Direct y validación E2E.

## Qué integra UGO

UGO usa **Uber Direct** como capa de logística/courier. No usa Uber Eats Marketplace para asignar profesionales UGO y no obtiene conductores de Uber para realizar trabajos de UGO.

Flujo soportado por el backend:

```text
UGO Admin
  → OAuth 2.0 Uber Direct
  → cotización
  → creación de entrega
  → consulta/listado
  → cancelación
  → tracking_url / webhooks de Uber
```

Endpoint UGO:

```text
/api/uber/direct
```

Acciones:

- `test`
- `quote`
- `create_delivery`
- `get_delivery`
- `list_deliveries`
- `cancel_delivery`

El endpoint exige sesión Admin/Super Admin y nunca envía Client Secret al navegador.

## Credenciales requeridas

Configurar en Vercel/server:

```text
UBER_DIRECT_CLIENT_ID
UBER_DIRECT_CLIENT_SECRET
UBER_DIRECT_CUSTOMER_ID
```

Opcional:

```text
UBER_DIRECT_API_BASE_URL
```

Si no se define base URL, UGO usa:

```text
https://api.uber.com/v1
```

## Dónde obtenerlas

Para esta integración no alcanza con crear una aplicación genérica en el Developer Dashboard.

1. Entrar a **Uber Direct**: https://direct.uber.com
2. Crear o abrir la organización Direct.
3. Ir a **Management → Developer**.
4. Copiar:
   - Customer ID
   - Client ID
   - Client Secret
5. Empezar en **Test mode**.
6. Recién después de validar el flujo, habilitar billing y solicitar/usar Production.

Si Uber obliga a completar el formulario genérico de **Create Application** mostrado en el dashboard, seleccionar **Others** y **Testing** para la etapa inicial. No seleccionar `FreightCarrierAPITesting` para UGO salvo indicación expresa de Uber.

## Prueba desde el panel UGO

Ruta:

```text
Admin → Configuración → Sistema → Integraciones → Uber Direct → Testar conexión
```

Estados esperados:

- sin las 3 variables → **Aguardando credenciales**
- OAuth rechazado → **Falha de autenticação**
- OAuth + Customer ID válidos → **Operacional**

## Contrato del gateway

### Test

```http
POST /api/uber/direct
Authorization: Bearer <SUPABASE_ADMIN_TOKEN>
Content-Type: application/json

{"action":"test"}
```

### Cotización

El `payload` usa el contrato oficial de Uber Direct.

```json
{
  "action": "quote",
  "payload": {
    "pickup_address": "{\"street_address\":[\"...\"],\"city\":\"...\",\"state\":\"...\",\"zip_code\":\"...\",\"country\":\"BR\"}",
    "dropoff_address": "{\"street_address\":[\"...\"],\"city\":\"...\",\"state\":\"...\",\"zip_code\":\"...\",\"country\":\"BR\"}"
  }
}
```

### Crear entrega

```json
{
  "action": "create_delivery",
  "payload": {
    "quote_id": "dqt_...",
    "pickup_address": "...",
    "pickup_name": "UGO",
    "pickup_phone_number": "+55...",
    "dropoff_address": "...",
    "dropoff_name": "Cliente UGO",
    "dropoff_phone_number": "+55...",
    "manifest_items": [
      {"name":"Item","quantity":1}
    ]
  }
}
```

### Consultar entrega

```json
{"action":"get_delivery","deliveryId":"del_..."}
```

### Cancelar

```json
{"action":"cancel_delivery","deliveryId":"del_...","payload":{}}
```

## Reglas UGO

- las credenciales son exclusivamente server-side;
- nunca guardar Client Secret en `VITE_*`;
- usar credenciales TEST hasta completar validación;
- no marcar Uber como operacional solo porque existan variables: el test OAuth debe pasar;
- una entrega Uber debe conservar su `delivery_id`, `quote_id` y `tracking_url` asociados al registro UGO que la originó;
- la integración logística no altera el `serviceId` canónico del servicio UGO.

## Pendiente para producción

Para cerrar la integración en runtime real faltan solamente acciones externas:

1. obtener las tres credenciales de Uber Direct;
2. cargarlas como secretos en Vercel;
3. ejecutar **Testar conexão**;
4. realizar una cotización y una entrega sandbox;
5. configurar webhook de estados y persistir eventos en Supabase;
6. habilitar Production únicamente después de la aprobación/billing de Uber.
