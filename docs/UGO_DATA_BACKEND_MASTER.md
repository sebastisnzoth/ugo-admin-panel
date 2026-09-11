# UGO — Data & Backend Master

**Versión:** 2.2 · 11 de septiembre de 2026  
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
- toda escritura crítica valida actor + estado anterior + precondiciones.

---

# 2. Dominios

```text
Auth/Identidad
Clientes
Proveedores/KYC
Categorías
Servicios
Matching/Ofertas
Tracking
Pagos
Ledger/Comisiones
Retiros
Evidencias
Ampliaciones
Disputas
Calificaciones
Notificaciones
Scout/Analytics
Hugo
Academia
Auditoría
```

---

# 3. Estado de servicio

Estado persistido canónico observado hoy en `main`:

```text
borrador → buscando → ofrecido → asignado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones:

```text
cancelado · disputado
```

La preparación financiera **no agrega estados artificiales al servicio**. Entre `asignado` y `en_camino` existe una condición de habilitación derivada de `pagos`:

```text
electrónico: pago realmente retenido/protegido + referencia verificable
O
efectivo: método presencial explícitamente seleccionado
```

`pago_pendiente`, `pago_habilitado` y `pago_protegido` son conceptos/condiciones financieras y no deben inventarse como estado persistido de `servicios` salvo una futura migración explícita del dominio.

Las transiciones sensibles viven en RPC/backend.

---

# 4. Estado operacional del proveedor

```text
offline → available → opportunity_pending → assigned
→ busy → completion_pending → available
```

No persistir estados de servicio como si fueran estados propios del proveedor salvo campos derivados claramente documentados.

---

# 5. Matching

`ofertas_servicio` representa oportunidades concretas. Demanda agregada es analítica separada.

Contrato:

```text
serviceId
→ oferta vinculada
→ proveedor autorizado analiza
→ aceptación atómica
→ asignación única
→ tarifa real fijada
→ comisión/neto consistentes
→ invalidación/expiración de competidoras
→ ambos roles observan el mismo servicio
```

Estado actual endurecido:

- aceptación serializada por servicio;
- una sola asignación ganadora;
- oferta sin tarifa operable no debe producir servicio asignado cobrable con importe cero;
- producción verificada sin servicios `asignado` con tarifa inválida al cierre del bloque del 11/09/2026.

---

# 6. Pagos

## Electrónico

```text
pendiente → autorizado → retenido/protegido
→ liberación pendiente → liberado/pagado
```

Requisitos:

- referencia externa persistente;
- importe reconciliado server-side;
- webhook idempotente;
- duplicados seguros;
- reembolso/liberación auditables;
- cualquier monto adicional aprobado debe quedar financiado/reconciliado antes del cierre.

## Efectivo

```text
metodo=efectivo
→ seleccionado
→ servicio habilitado según contrato
→ presencial pendiente
→ proveedor confirma recepción
→ registrado/liberado
```

Reglas:

- efectivo nunca se marca electrónicamente protegido;
- confirmación idempotente;
- importe y ampliaciones quedan auditados;
- comisión UGO debe registrarse en ledger/cuenta corriente cuando aplique;
- disputa en efectivo no promete reembolso automático desde fondos no custodiados.

## Lock de método

Una vez elegido un método válido, no se reemplaza arbitrariamente por otro mientras el pago siga activo. Un cambio sólo puede habilitarse para un intento realmente fallido o mediante un contrato backend explícito de recuperación.

---

# 7. Ledger / comisiones

Objetivo: evitar fuga de ingresos y permitir conciliación.

Cada obligación financiera debe poder explicar:

```text
origen
serviceId
método de pago
importe bruto
comisión UGO
neto proveedor
estado
fecha
referencia
```

El saldo mostrado al proveedor nunca es autoridad suficiente para retiro; backend calcula/valida saldo disponible.

---

# 8. Evidencia de solicitud

Tabla/bucket existente según migraciones vigentes.

Contrato:

```text
Cliente carga
→ vínculo a draft/request id explícito
→ solicitud creada
→ matching
→ proveedor autorizado consulta
```

P0: eliminar asociaciones ambiguas de evidencia huérfana.

Validar MIME, tamaño, ownership, acceso y expiración de signed URLs.

---

# 9. Evidencia operacional

Tipos:

```text
antes · durante · despues · documento
```

Contrato temporal endurecido:

```text
llegado              → permite Antes
en_progreso          → permite Durante / Después
esperando_aprobacion → permite Después sólo como recuperación histórica
```

Reglas:

- una foto `Antes` cargada fuera de `llegado` se rechaza;
- una foto `Durante` fuera de `en_progreso` se rechaza;
- una foto `Después` antes de `en_progreso` se rechaza;
- iniciar exige evidencia inicial real del proveedor asignado;
- solicitar finalización exige evidencia final real;
- `storage_path` debe ser no vacío;
- backend/RPC es el guard definitivo; la UI sólo acompaña.

Migración vigente: `20260911215500_service_evidence_state_guard.sql`.

---

# 10. Tracking y llegada

Durante `en_camino`, la ubicación del proveedor puede actualizarse por RPC y el Cliente consulta tracking autorizado del mismo `serviceId`.

Contrato de llegada:

```text
asignado + pago habilitado
→ en_camino
→ ubicación proveedor actualizada
→ llegado
```

Cuando el servicio posee coordenada de cliente y no es excepción DEMO/Admin, la confirmación `en_camino → llegado` exige proximidad backend. El radio operativo vigente es **200 m**. La UI debe comunicar el mismo radio; nunca usar un umbral distinto como autoridad paralela.

---

# 11. Ampliaciones

```text
propuesta pendiente
→ aprobada / rechazada / cancelada
```

Datos mínimos:

```text
serviceId
autor
descripción
costo extra
tiempo extra
estado
resolución
impacto de pago
created_at / resolved_at
```

Cliente es autoridad de aprobación del alcance adicional, pero **aprobar alcance con costo requiere que el impacto financiero sea seguro**.

Contrato actual:

```text
monto_extra = 0
→ puede aprobarse sin alterar fondos

sin pago creado
→ aprobar incorpora monto/comisión/neto al servicio antes del checkout

efectivo presencial pendiente
→ aprobar reajusta pago + servicio de forma auditable

pago fallido/reembolsado
→ aprobar reajusta el total; el próximo intento de pago usa el total nuevo

pago electrónico activo/protegido + monto_extra > 0
→ NO aprobar todavía
→ requiere checkout/reconciliación específica del delta
```

Hasta implementar el checkout electrónico de ajuste, UGO **no puede convertir una ampliación con costo en trabajo aprobado no financiado**. La UI debe mostrar este bloqueo y el backend debe rechazar la aprobación.

Defensa adicional: `en_progreso → esperando_aprobacion` se bloquea si existe una ampliación aprobada histórica con `pago_estado='pendiente_ajuste'`.

Migración vigente: `20260911222000_service_expansion_payment_guard.sql`.

Producción al aplicar el hardening: `ampliaciones_servicio` tenía 0 registros, por lo que no hubo deuda histórica que reparar.

P0 abierto: construir un mecanismo real de **pago del delta electrónico** y reconciliarlo antes de permitir aprobación/continuación de alcance con costo.

---

# 12. Disputas

Toda disputa debe conservar:

```text
serviceId
actor
motivo
cronología
evidencias
método de pago
impacto financiero posible
resolución
admin responsable
```

La resolución financiera depende del método y de fondos realmente custodiados.

---

# 13. Realtime

Dominios principales:

```text
servicios
ofertas
pagos
notificaciones
ampliaciones
evidencias cuando corresponda
```

Reglas:

- filtro por usuario/servicio;
- cleanup;
- evitar canales duplicados;
- refetch tras reconexión;
- autorización nunca derivada sólo de Realtime;
- persistencia confirmada antes de considerar mutación real.

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

`*` depende de estado/participación. Debe verificarse con pruebas positivas y negativas.

---

# 15. Admin / Super Admin

La UI puede ocultar acciones, pero la autorización real debe existir server-side/RLS/RPC.

Acciones críticas de Admin deben dejar audit trail:

```text
actor
acción
recurso
antes
después
motivo
timestamp
```

---

# 16. Privacidad y geolocalización

Minimización:

```text
Cliente     proveedor asignado / ETA necesario
Proveedor   propia ubicación + destino autorizado
Admin       según privilegio operacional
Público     sin coordenadas sensibles innecesarias
```

Scout usa preferentemente agregados geográficos.

---

# 17. Atomicidad obligatoria

Requieren transacción/RPC/constraint:

```text
aceptar oportunidad
asignar proveedor
cambiar estados críticos
aprobar ampliación
confirmar pago/efectivo
liberar/reembolsar
cerrar servicio
procesar retiro
resolver disputa financiera
```

Bloquear doble click en frontend es sólo una defensa UX.

---

# 18. Eventos conceptuales

```text
service.requested
match.offered
match.accepted
service.assigned
payment.method_selected
payment.authorized
payment.protected
provider.on_the_way
provider.arrived
service.started
expansion.proposed
expansion.resolved
expansion.payment_adjustment_required
expansion.payment_adjusted
service.completion_requested
service.approved
payment.released
cash.received
service.disputed
service.completed
```

Sirven como nomenclatura común para notificaciones, analytics, Scout y auditoría.

---

# 19. Definition of Done backend

```text
migración versionada
schema/constraints
RLS
RPC/API
actor permitido + actor denegado
happy path + error + retry
idempotencia/concurrencia
Realtime/Storage si aplica
auditoría financiera si aplica
tests ejecutables
maestros actualizados
```

---

# 20. Regla final

**Si frontend y backend difieren, se corrige el contrato completo; nunca se maquilla una inconsistencia sólo en la UI.**