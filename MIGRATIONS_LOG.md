# Etapa 1: Regiones y Estados de Verificación

**Fecha**: Julio 5, 2026  
**Rama backup**: `backup/etapa-1-regiones-estados`  
**Commit**: Migraciones Supabase aplicadas

## Cambios en DB

### Tabla: regiones (NUEVA)
- `id UUID` (PK)
- `codigo_pais VARCHAR(2)` UNIQUE (BR, AR, etc.)
- `nombre_pais VARCHAR(100)`
- `moneda VARCHAR(3)` (BRL, ARS, UYU, etc.)
- `simbolo_moneda VARCHAR(5)` (R$, $, etc.)
- `metodos_pago_cliente JSONB` (["credito", "pix", "mercado_pago"])
- `metodo_payout_proveedor VARCHAR(50)` (pix, mercado_pago, cbu, etc.)
- `tarifario_base JSONB` ({base, km, request_fee, comision})
- `activo BOOLEAN` (default TRUE)

### Tabla: usuarios (MODIFICADA)
- `region_cuenta UUID` FK → regiones.id
- `estado_verificacion VARCHAR(50)` (registrado, perfil_completo, docs_pendientes, en_revision, verificado, rechazado)
- `onboarding_paso INTEGER` (0-6, guarda el progreso del wizard)
- `motivo_rechazo TEXT` (nullable, para docs rechazados)

### Datos iniciales
- Brasil: BRL, PIX, Mercado Pago
- Argentina: ARS, Mercado Pago

## Próxima Etapa
Etapa 2: Wizard de inscripción en provider.html (6 pasos con validación)

## RLS
- Tabla `regiones`: SELECT abierto (todos pueden ver disponibilidad de países)
- Índices creados en `region_cuenta` y `estado_verificacion` para performance
