# Propuesta · Llegada automática por geocerca (200 m)

**Estado:** propuesta con decisiones tomadas (ver sección "Decisiones"). No implementada. No cambia migraciones, RPCs ni permisos.
**Autoridad:** `docs/UGO_ECOSISTEMA_FLUJO.md` §5.1 (radio operativo de 200 m, backend con autoridad, `YA LLEGUÉ` como respaldo manual).

## Objetivo
Registrar la llegada del proveedor sin que tenga que tocar nada cuando la ubicación, los permisos y la red son confiables. Si no se puede validar, el proveedor confirma con `YA LLEGUÉ`.

## Principios
1. **El backend decide.** La UI muestra el resultado; no calcula la distancia como fuente de verdad.
2. **Respaldo manual siempre disponible** cuando la señal no es confiable.
3. **Sin ubicación exacta del cliente, no hay validación geográfica.** En ese caso solo queda el respaldo manual.
4. **Trazable:** cada llegada guarda método (`automatica` o `manual`), distancia reportada y marca de tiempo.

## Flujo propuesto
```text
proveedor en_camino
→ la app envía posiciones con permiso vigente
→ backend calcula distancia al punto exacto del servicio
→ si distancia <= 200 m y la posición es reciente → llegada automática
→ si no → UI ofrece YA LLEGUÉ (manual, con registro)
```

## Decisiones
1. **Antigüedad máxima de posición:** 30 segundos.
2. **Precisión mínima del GPS:** 50 metros. Si la precisión es peor, no se valida automáticamente.
3. **`YA LLEGUÉ` con distancia mayor a 200 m:** requiere motivo. Queda registrado como `manual` con el motivo.
4. **Dónde vive la regla:** RPC de Supabase.

## Fuera de alcance de esta propuesta
- Cambios en la app de producción.
- Migraciones en TEST o PROD.
- Hugo por voz.

## Criterios de aceptación (cuando se implemente)
- Llegada automática registrada dentro de 200 m con posición reciente.
- Fuera de 200 m, la llegada automática no se registra.
- `YA LLEGUÉ` funciona sin GPS y deja método `manual`.
- Pruebas de contrato y de integración en UGO TEST.
