# UGO — Agent Handoff

**Actualizado:** 16 de septiembre de 2026  
**Estado:** UGO TEST en desarrollo; no promovible todavía a producción comercial  
**Rama única:** `main`

## Entorno

```text
Repo: sebastisnzoth/ugo-admin-panel
Supabase TEST: tmossnqfwfwjrtzwcbmm
Supabase PROD: trfsjuseqjxlhrxuvdsm · FUERA DE ALCANCE
Cliente: /?app=client
Proveedor: /?app=provider
Admin: /?app=admin
Desarrollo: /?app=development · público/read-only
```

La publicación web no se presume equivalente a `main`; verificar revisión exacta antes de usarla como evidencia.

## Regla de madurez

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ PUBLISHED
```

## Base inspeccionada antes de esta sincronización

```text
HEAD: 19c6dcddd2410b063e0d4171cd2178b95da47ef3
commit: fix(sentinel): classify core runtime actions server-side
```

Core CI:

```text
run: 35040842854
conclusion: failure
```

Pasaron instalación, security gate, readiness de credenciales y TypeScript/build. Falló el bloque de core lifecycle/contracts; lint posterior quedó skipped.

Conclusión obligatoria: ese SHA está IMPLEMENTED pero **NO CI VALIDATED**.

## Desarrollo público

IMPLEMENTED en `main`:

- `?app=development` ya no usa `AdminGate`;
- dashboard read-only;
- vistas públicas sanitizadas de checklist/eventos/incidentes;
- base readiness privada continúa protegida;
- señal realtime pública no sensible;
- feed público sin serviceId, stack, metadata privada ni reporter IDs.

No marcar CI VALIDATED hasta una corrida verde del SHA que contenga esta consolidación.

## Centinela

IMPLEMENTED:

- `runtimeRevision` en cada build;
- dashboard distingue build actual de histórico;
- redacción de emails/teléfonos/links y metadata sensible;
- cola local limitada para fallos anónimos seguros + flush posterior;
- matching/cancel/status/ubicación Cliente instrumentados;
- operaciones críticas Proveedor instrumentadas;
- clasificación server-side desde acciones conocidas;
- incidentes runtime aislados del readiness.

Invariante: **Centinela nunca muta ni aprueba `development_checklist`.**

## Cliente

Mantener como canónico:

- `ClientRoot` abre detalle por `serviceId` seleccionado;
- Home/Actividad deben abrir el pedido exacto;
- `ClientServiceDetail` consulta ownership por cliente y serviceId;
- `ServiceChat` trabaja por `serviceId`, realtime + refetch/reconnect;
- quick replies estilo Uber;
- filtro de contacto off-platform;
- múltiples pedidos simultáneos permitidos.

P0 runtime pendiente: dos sesiones reales para chat y matching/cancelación.

## Proveedor

Happy path visible:

```text
Ver problema
→ Aceptar
→ Estoy yendo
→ Llegué/fallback
→ Empezar trabajo
→ Listo
```

Agenda puede contener varios trabajos futuros. Cada acción debe operar el `serviceId` exacto.

P0 runtime pendiente: lifecycle completo + Agenda + chat en dispositivo.

## Multi-pedido

Principio:

> **Un pedido. Un profesional. Sin vueltas.**

No significa “un pedido activo por cliente”. Deben coexistir A+B+C independientes. Prohibido usar `latest active`, `.limit(1)` o un `activeServiceId` global para mutaciones ambiguas.

## Android TEST

El flujo QA actual empaqueta la UI local (`dist`) dentro del APK TEST y usa backend API configurado para `/api`; no debe cargar UI remota con `server.url`.

Cada artifact debe identificar SHA. Compilar ≠ probar en teléfono.

La prueba física prioritaria es Cliente + Proveedor en dos Android con Realtime, GPS, cámara, Storage, chat, lifecycle, background/foreground y A+B+C.

## Publicación

No realizar deploy sólo porque `main` avanzó. La publicación está desacoplada y se hace cuando el bloque funcional necesita una revisión web/externa.

Para declarar PUBLISHED registrar:

```text
revisión
canal/entorno
smoke
dependencias/backend
rollback/mitigación
```

La ruta de hosting retirada no forma parte del camino activo ni debe bloquear readiness.

## Finanzas

La política definitiva de saldo/retiro sigue siendo una decisión de producto pendiente. No inventar RPCs de saldo/retiro ni convertir dinero de servicios incompletos/cancelados en saldo disponible.

## Seguridad/producción pendiente

```text
MFA Admin
protección de credenciales
api privilegiadas
Bearer/Auth/ownership/rol
rate limit
secrets/auditoría
backups/observabilidad
rollback
protección de main
```

## NEXT

```text
1 consolidar maestros en main
2 recuperar UGO Core CI verde sobre el nuevo HEAD
3 ejecutar/smoke Desarrollo + Centinela en TEST
4 E2E Cliente↔Proveedor exact serviceId + chat
5 A+B+C + cancelación selectiva
6 prueba física dos Android
7 pagos/finanzas/security pendientes
8 publicar sólo cuando el bloque funcional lo requiera
```

**No tocar Supabase PROD. No crear ramas. No asumir que una publicación vieja representa `main`.**
