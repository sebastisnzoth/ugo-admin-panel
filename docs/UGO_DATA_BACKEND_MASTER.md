# UGO — Data & Backend Master

**Versión:** 2.4 · 11 de septiembre de 2026  
**Estado:** contrato maestro de datos, Supabase y backend  
**Rama de verdad:** `main`

> PostgreSQL/Supabase es la fuente persistente de verdad operacional. La UI interpreta estado; no lo inventa.

---

# 1. Principios

- un solo `serviceId` para Cliente, Proveedor y Admin;
- RLS por rol, ownership y participación;
- RPC/transacción para transiciones críticas;
- Realtime refleja cambios persistidos;
- Storage sensible privado;
- migraciones versionadas;
- DEMO y REAL explícitos;
- dinero y estados críticos auditables e idempotentes;
- toda escritura crítica valida actor + estado anterior + precondiciones;
- secretos nunca vuelven al navegador;
- credencial almacenada, configuración presente, feature habilitada y E2E validado son estados distintos.

---

# 2. Dominios

```text
Auth/Identidad · Clientes · Proveedores/KYC · Categorías
Servicios · Matching/Ofertas · Tracking · Pagos · Ledger/Comisiones
Retiros · Evidencias · Ampliaciones · Disputas · Calificaciones
Notificaciones · Scout/Analytics · Hugo · Academia · Auditoría
Integraciones/credenciales
```

---

# 3. Estado de servicio

```text
borrador → buscando → ofrecido → asignado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones: `cancelado`, `disputado`.

La preparación financiera no agrega estados artificiales al servicio. Para `asignado → en_camino`:

```text
electrónico = retenido/protegido + referencia verificable
O
efectivo = método presencial explícitamente seleccionado
```

---

# 4. Estado operacional del proveedor

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

No mezclar con el lifecycle del servicio.

---

# 5. Matching

`ofertas_servicio` representa oportunidades concretas. Demanda agregada es analítica separada.

Contrato:

```text
serviceId → oferta → proveedor autorizado
→ aceptación atómica → asignación única
→ tarifa real + comisión + neto
→ invalidación de competidoras
```

Producción fue verificada sin servicios asignados ni ofertas pendientes con tarifa inválida al cerrar el hardening del 11/09/2026.

---

# 6. Pagos

## Electrónico

```text
pendiente → autorizado → retenido/protegido
→ liberación pendiente → liberado/pagado
```

Requiere referencia externa, importe/moneda reconciliados server-side, webhook idempotente, duplicados seguros y reembolso/liberación auditables.

## Efectivo

```text
seleccionado → presencial pendiente
→ proveedor confirma recepción → registrado/liberado
```

Efectivo nunca se representa como custodia electrónica UGO.

## Lock de método

Una vez elegido un método válido no se sustituye silenciosamente mientras siga activo; recuperación sólo para intento fallido o contrato backend explícito.

---

# 7. Ledger / comisiones

Cada obligación financiera debe explicar:

```text
origen · serviceId · método · bruto · comisión UGO · neto proveedor
estado · fecha · referencia
```

El saldo UI nunca es autoridad suficiente para retiro.

---

# 8. Evidencia de solicitud

Cliente carga evidencia vinculada inequívocamente a draft/request; luego solicitud/matching/proveedor autorizado. Validar MIME, tamaño, ownership y signed URLs.

P0: eliminar asociaciones ambiguas de evidencia huérfana.

---

# 9. Evidencia operacional

```text
llegado              → Antes
en_progreso          → Durante / Después
esperando_aprobacion → Después sólo recuperación histórica
```

Reglas backend:

- `Antes` fuera de `llegado`: rechazado;
- `Durante` fuera de `en_progreso`: rechazado;
- `Después` antes de `en_progreso`: rechazado;
- iniciar exige evidencia inicial del proveedor asignado;
- solicitar finalización exige evidencia final real;
- `storage_path` no vacío.

Migración vigente: `20260911215500_service_evidence_state_guard.sql`.

---

# 10. Tracking y llegada

Durante `en_camino`, proveedor actualiza ubicación por RPC y Cliente consulta tracking autorizado del mismo `serviceId`.

Cuando existe coordenada exacta y no aplica excepción, `en_camino → llegado` exige proximidad backend. Radio vigente: **200 m**.

---

# 11. Ampliaciones

```text
propuesta pendiente → aprobada / rechazada / cancelada
```

Datos mínimos: `serviceId`, autor, descripción, costo, tiempo, estado, resolución, impacto de pago y timestamps.

Contrato financiero:

```text
monto_extra = 0 → puede aprobarse
sin pago → incorpora monto antes del checkout
efectivo pendiente → reajusta servicio + pago
pago fallido/reembolsado → reajusta siguiente intento
pago electrónico activo + extra > 0
→ checkout separado del delta
→ webhook valida monto/moneda
→ confirmar_pago_ampliacion incorpora delta/comisión/neto
→ aprobada + incluido
```

El pago base no se reescribe. La ampliación registra estado/procesador/referencia/monto/moneda del ajuste. Reembolso posterior devuelve `pago_estado` a `pendiente_ajuste` y bloquea cierre hasta conciliación.

Migraciones vigentes:

- `20260911222000_service_expansion_payment_guard.sql`
- `20260911224500_expansion_electronic_checkout.sql`

P0 restante: E2E real de retry/webhook duplicado/reembolso + convergencia Realtime.

---

# 12. Disputas

Toda disputa conserva `serviceId`, actor, motivo, cronología, evidencia, método de pago, impacto financiero, resolución y admin responsable. La resolución financiera depende de fondos realmente custodiados.

---

# 13. Realtime

Dominios principales: `servicios`, `ofertas`, `pagos`, `notificaciones`, `ampliaciones`, evidencias cuando aplique.

Reglas: filtros por usuario/servicio, cleanup, reconexión/refetch, sin autorización implícita y persistencia confirmada antes de considerar mutación real.

---

# 14. RLS objetivo

```text
                     Cliente      Proveedor       Admin/Super
perfil propio          RW            RW              R*
servicio propio        RW            R/RW*           RW
oferta                 R*            RW propia       RW
pago                   R             R propia        RW
evidencia solicitud    RW            R autoriz.      R
evidencia servicio     R             RW autoriz.     RW
disputa propia         RW            RW propia       RW
KYC sensible           limitado      limitado        autorizado
config global          -             -               RW privilegiado
```

Debe verificarse con pruebas positivas y negativas.

---

# 15. Admin / Super Admin

La UI puede ocultar acciones, pero autorización real vive server-side/RLS/RPC. Acciones críticas dejan actor, acción, recurso, antes/después, motivo y timestamp.

## Integraciones y credenciales

UGO distingue cuatro niveles:

```text
1 credencial almacenada
2 configuración disponible en runtime
3 feature habilitada
4 integración validada E2E
```

No son equivalentes.

### Bóveda privada

`private.payment_credentials` almacena credenciales administrables. Los RPC:

```text
admin_payment_credentials_status
admin_set_payment_credentials
admin_clear_payment_credentials
```

exigen `private.is_admin(auth.uid())`. `admin_payment_credentials_status()` devuelve sólo metadata (`provider`, país, entorno, enabled, configured, updated_at), nunca secretos.

La migración `20260911230000_admin_payment_credentials_status_fix.sql` está aplicada en producción. Reemplaza una dependencia no portable de `jsonb_object_length` por comparación segura con `{}` y mantiene `public/anon` revocados.

Al momento de la auditoría del 11/09/2026, la bóveda privada tenía **0 filas configuradas**. Eso no permite inferir si Vercel posee variables de entorno; son fuentes distintas.

### Runtime real actual

Los adapters server-side consumen actualmente variables de entorno, no la bóveda privada:

```text
Mercado Pago BR → MERCADO_PAGO_ACCESS_TOKEN
Pix direto      → UGO_PIX_KEY
OpenPix         → OPENPIX_SANDBOX_APP_ID + PAYMENTS_OPENPIX_ENABLED
Hugo Voice      → OPENAI_API_KEY
WhatsApp        → WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID
```

Mercado Pago Argentina permanece bloqueado por el router en esta fase aunque exista flag declarada.

`api/admin/integrations-status.ts` verifica Admin/Super Admin y expone únicamente metadata segura del runtime. Nunca devuelve valores secretos.

**Regla:** una credencial guardada en el panel no debe mostrarse como “integración activa” mientras el adapter productivo no la consuma realmente.

P1 arquitectónico: unificar resolución de credenciales server-side (bóveda segura con auditoría/rotación + fallback controlado) antes de depender operacionalmente del editor de credenciales Admin.

---

# 16. Privacidad y geolocalización

Minimizar coordenadas por rol. Cliente recibe proveedor/ETA necesarios; Proveedor ve destino autorizado; Admin sólo según privilegio; Scout usa agregados preferentemente.

---

# 17. Atomicidad obligatoria

RPC/transacción/constraint para:

```text
aceptar oportunidad · asignar proveedor · estados críticos
aprobar ampliación · confirmar pago/efectivo/ampliación
liberar/reembolsar · cerrar servicio · retiro · disputa financiera
```

Bloquear doble click sólo es defensa UX.

---

# 18. Eventos conceptuales

```text
service.requested · match.offered · match.accepted · service.assigned
payment.method_selected · payment.authorized · payment.protected
provider.on_the_way · provider.arrived · service.started
expansion.proposed · expansion.payment_adjustment_required
expansion.payment_adjusted · expansion.resolved
service.completion_requested · service.approved · payment.released
cash.received · service.disputed · service.completed
```

---

# 19. Definition of Done backend

```text
migración versionada
schema/constraints
RLS
RPC/API
actor permitido + denegado
happy path + error + retry
idempotencia/concurrencia
Realtime/Storage si aplica
auditoría financiera si aplica
tests ejecutables
maestros + Roadmap actualizados
```

Para integraciones externas: metadata segura, secretos server-side, feature state explícito, observabilidad, retry y evidencia E2E cuando corresponda.

---

# 20. Regla final

**Si frontend y backend difieren, se corrige el contrato completo; nunca se maquilla una inconsistencia sólo en la UI.**