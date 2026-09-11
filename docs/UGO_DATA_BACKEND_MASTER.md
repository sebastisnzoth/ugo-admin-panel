# UGO — Data & Backend Master

**Versión:** 2.0 · 11 de septiembre de 2026  
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

```text
solicitado → buscando → ofertado → asignado
→ pago_pendiente / pago_habilitado
→ en_camino → llegado → en_progreso
→ esperando_aprobacion → completado
```

Excepciones:

```text
cancelado · disputado · reembolsado
```

`pago_protegido` es condición/estado financiero específico de custodia electrónica y no estado universal del servicio.

Las transiciones sensibles deben vivir en RPC/backend.

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
→ invalidación/expiración de competidoras
→ ambos roles observan el mismo servicio
```

P0: constraints/RPC contra doble aceptación y race conditions.

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
- ampliaciones pueden generar `pendiente_ajuste`.

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

```text
antes · durante · despues · documento
```

Cuando el contrato lo requiera:

- iniciar exige evidencia inicial;
- solicitar finalización exige evidencia final;
- guard definitivo backend/RPC.

---

# 10. Ampliaciones

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

Cliente es autoridad de aprobación del alcance adicional.

---

# 11. Disputas

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

# 12. Realtime

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

# 13. RLS objetivo

```text
                     Cliente      Proveedor       Admin/Super
perfil propio          RW            RW              R*
servicio propio        RW            R/RW*           RW
oferta                 R*            RW propia       RW
pago                   R             R propia        RW
evidencia solicitud    RW            R autoriz.      R
evidencia servicio     R/RW*         RW autoriz.     RW
disputa propia         RW            RW propia       RW
KYC sensible           limitado      limitado        autorizado
config global          -             -               RW privilegiado
```

`*` depende de estado/participación. Debe verificarse con pruebas positivas y negativas.

---

# 14. Admin / Super Admin

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

# 15. Privacidad y geolocalización

Minimización:

```text
Cliente     proveedor asignado / ETA necesario
Proveedor   propia ubicación + destino autorizado
Admin       según privilegio operacional
Público     sin coordenadas sensibles innecesarias
```

Scout usa preferentemente agregados geográficos.

---

# 16. Atomicidad obligatoria

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

# 17. Eventos conceptuales

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
service.completion_requested
service.approved
payment.released
cash.received
service.disputed
service.completed
```

Sirven como nomenclatura común para notificaciones, analytics, Scout y auditoría.

---

# 18. Definition of Done backend

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

# 19. Regla final

**Si frontend y backend difieren, se corrige el contrato completo; nunca se maquilla una inconsistencia sólo en la UI.**