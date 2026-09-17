# UGO — Dual Implementation Master

**Versión:** 1.0 · 16 de septiembre de 2026  
**Estado:** contrato operativo para desarrollo paralelo A ↔ B  
**Rama de verdad en cada repo:** `main`

> **Un pedido. Un profesional. Sin vueltas.**

## 1. Objetivo

UGO se desarrolla temporalmente mediante **dos implementaciones en paralelo** que compiten, se auditan mutuamente y comparten mejoras demostradas:

- **UGO A — Core actual:** `sebastisnzoth/ugo-admin-panel`
- **UGO B — AI Studio / UI alternativa:** `sebastisnzoth/UGO-PRODUCCION`

No son dos negocios ni dos backends. Son dos implementaciones de la misma experiencia UGO sobre un **único contrato de producto, datos, seguridad y lifecycle**.

La competencia existe para responder con evidencia:

```text
¿qué implementación permite a Cliente + Proveedor completar el servicio
más rápido, con menos errores, mejor experiencia móvil y costo $0?
```

El objetivo no es defender una base de código. **Gana cada solución que demuestre funcionar mejor.** Una mejora comprobada puede pasar de A → B o de B → A sin esperar a una migración total.

## 2. Regla de convivencia

```text
UGO A continúa
+ UGO B avanza en paralelo
+ mismo contrato backend
+ despliegues/frontends separados
+ aprendizaje compartido
= competencia controlada, sin frenar el producto
```

Ningún trabajo en UGO B autoriza a detener P0/P1 de UGO A. Ningún problema histórico de UGO A obliga a copiar su implementación a B.

La UI, arquitectura de frontend y composición de flujo pueden competir. **La verdad de negocio no compite:** identidad de pedido, estados, permisos, dinero, seguridad y persistencia son comunes.

## 3. Qué puede competir y qué no

### Puede competir

- navegación y arquitectura de frontend;
- UI/UX Cliente, Proveedor y superficies operativas;
- densidad de pasos;
- responsive/mobile shell;
- componentes;
- estrategia de estado del frontend;
- recuperación visual de errores;
- rendimiento percibido;
- accesibilidad;
- claridad de textos;
- forma de consumir el mismo contrato backend.

### No puede divergir

- `serviceId` como identidad transversal;
- lifecycle canónico de servicio;
- capacidad de varios pedidos simultáneos por cliente;
- asignación atómica de proveedor;
- RLS/RPC y autoridad server-side para mutaciones críticas;
- separación entre estado del servicio y disponibilidad del proveedor;
- reglas de chat/contact guard;
- estados de pago/cobro;
- permisos Cliente / Proveedor / Admin;
- auditoría y evidencia;
- seguridad de secretos;
- contrato Realtime;
- reglas comerciales vigentes.

Si una implementación necesita cambiar uno de esos contratos, el cambio se diseña primero en los maestros canónicos y recién después se implementa en A y/o B.

## 4. Backend compartido: una sola realidad

Durante la competencia técnica:

- **no se crea una segunda base de datos por comodidad**;
- UGO A y UGO B consumen el **mismo contrato Supabase de UGO TEST**;
- **Supabase PROD no se toca** para habilitar esta competencia;
- cada pedido conserva un único `serviceId`;
- los dos frontends deben converger al mismo estado persistido;
- Realtime refleja la persistencia, no crea una segunda verdad;
- secretos y operaciones privilegiadas permanecen server-side;
- las variables públicas del frontend se cargan por entorno y nunca se hardcodean credenciales.

Para distinguir pruebas entre A y B, usar preferentemente **metadata de build/telemetría/Sentinel y usuarios de TEST separados**, no duplicar tablas ni contaminar el dominio con columnas de experimento salvo necesidad demostrada.

## 5. Entornos e aislamiento

```text
UGO A frontend/deploy ─┐
                       ├─→ Supabase TEST / contrato canónico
UGO B frontend/deploy ─┘
```

Cada repo conserva:

- su propio `main`;
- su propio build;
- su propio deploy/preview;
- sus propias variables de entorno de frontend;
- su propia revisión/commit identificable.

Compartir backend **no significa compartir estado local, builds ni releases**.

Una regresión de B no debe romper A. Una regresión de A no debe ocultarse detrás de B.

## 6. Regla económica: $0 obligatorio

La tesis operativa es **costo directo $0 mientras los recursos gratuitos disponibles lo permitan**.

Antes de incorporar infraestructura, API, modelo, hosting, observabilidad o servicio externo:

```text
1 verificar precio actual en fuente oficial
2 verificar límites del plan gratuito
3 verificar qué ocurre al superar el límite
4 estimar consumo de UGO
5 buscar alternativa open source / free tier
6 sólo después aprobar la dependencia
```

Si una capacidad necesaria exige pago:

- no habilitar facturación automáticamente;
- no comprometer gasto;
- buscar alternativa gratuita;
- o documentar necesidad y buscar créditos, sponsor, aceleradora, socio o apoyo externo.

### Supabase — verificación económica al 16/09/2026

La documentación oficial consultada para este contrato indica que el plan **Free es $0/mes**, permite **2 proyectos activos gratuitos** y publica, entre otros límites, **500 MB de base por proyecto, 5 GB de egress, 1 GB de Storage, 50.000 MAU, 2 millones de mensajes Realtime y 200 conexiones Realtime pico**. Los proyectos Free pueden pausarse después de una semana de inactividad. En Free, superar límites conduce a restricciones/Fair Use; no se habilita cobro automático de overage como mecanismo normal del plan gratuito.

Fuentes oficiales para revalidar antes de cualquier cambio de infraestructura:

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/billing-faq

**Estos límites no son una constante del código.** Revalidarlos cuando cambie el uso o antes de una decisión de escala.

## 7. UGO A — misión durante la competencia

UGO A sigue cerrando la ruta al primer servicio real. No se reinicia ni se pausa.

Prioridad vigente:

```text
request real
→ matching
→ asignación
→ chat bidireccional
→ multi-pedido
→ cancelación selectiva
→ lifecycle proveedor
→ tracking
→ cierre
→ pago/evidencia/rating
```

Su ventaja inicial es la integración backend, contratos, CI, Sentinel y madurez funcional ya acumulada.

## 8. UGO B — misión durante la competencia

UGO B parte de una experiencia visual más simple/amigable creada en AI Studio, pero debe dejar de ser un flujo de demostración para competir realmente.

Objetivo técnico:

```text
conservar la experiencia visual útil
→ eliminar mocks del camino crítico
→ conectar Supabase TEST
→ usar identidades/roles reales de TEST
→ persistir serviceId real
→ converger con Cliente/Proveedor/Admin
→ validar en móvil
```

No se considera avance real que una pantalla cambie de estado sólo con `useState`, timers, datos ficticios o navegación simulada.

## 9. Primer vertical slice obligatorio de UGO B

El primer circuito comparable debe ser pequeño, completo y real:

```text
Cliente crea pedido
→ pedido persiste
→ proveedor elegible/online aparece
→ proveedor acepta
→ Cliente ve asignación
→ ambos comparten estado por serviceId
→ chat Cliente ↔ Proveedor
→ proveedor cambia lifecycle
→ Cliente ve esos cambios
→ servicio se completa
→ rating/recibo básico
```

El slice también debe demostrar:

- **cancelación real** con persistencia;
- **salida de “buscando”** si no aparece proveedor, timeout, error u offline;
- **dos pedidos coexistentes** sin mezclar `serviceId`;
- recarga/reconexión sin perder el estado;
- mobile responsive sin controles superpuestos.

## 10. P0 específicos conocidos para UGO B

Antes de considerarla competidora funcional:

1. Reemplazar el shell móvil que intenta concentrar demasiados controles en una sola navbar por navegación responsive usable.
2. Cambiar el arranque de demo/previsualización por un entrypoint de producto coherente.
3. Separar `ScreenSwitcher` del camino de usuario real; puede quedar sólo como herramienta de desarrollo si aporta valor.
4. Introducir una capa de acceso al backend y configuración por entorno.
5. Sustituir `mockData` en el camino crítico por datos reales de TEST.
6. Implementar roles Cliente / Proveedor y sesión real de TEST.
7. Conectar request, matching, actividad, cancelación y lifecycle al mismo estado persistido.
8. Conectar chat bidireccional realtime por `serviceId`.
9. Evitar callejones sin salida, alerts como lógica de negocio y transiciones locales que finjan persistencia.
10. Validar 360 px, 390 px y 412 px antes de declarar una pantalla móvil cerrada.

## 11. Aprendizaje cruzado obligatorio

Cada hallazgo útil debe clasificarse así:

```text
A_ONLY      mejora específica de A
B_ONLY      mejora específica de B
SHARED      solución aplicable a ambos
BACKEND     contrato común que debe corregirse una vez
REJECTED    experimento que no mejora evidencia
```

Una mejora `SHARED` comprobada debe evaluarse en el otro repo en el siguiente bloque relacionado.

Ejemplos:

- B resuelve mejor navegación móvil → portar patrón a A si mantiene contratos.
- A resuelve recovery de Realtime → B reutiliza el patrón/contrato.
- A detecta fallo de RLS → se corrige backend común; B no inventa workaround inseguro.
- B reduce pasos de Proveedor → A lo adopta si pasa el mismo E2E.

## 12. Métricas de competencia

A y B se comparan con la **misma tarea, mismos criterios y mismo entorno TEST**.

Mínimo a registrar por flujo:

| Métrica | Criterio |
|---|---|
| Finalización E2E | pedido llega a estado final real |
| Tiempo de tarea | desde intención hasta acción completada |
| Errores P0/P1 | incidentes del build evaluado |
| Persistencia | reload conserva estado correcto |
| Realtime | contraparte recibe cambios sin mezclar servicios |
| Recuperación | timeout/offline/error ofrece salida coherente |
| Multi-pedido | A+B no se contaminan |
| Mobile | 360/390/412 sin superposición ni bloqueo |
| Accesibilidad | controles legibles, foco/labels/targets adecuados |
| Build/CI | gates aplicables verdes para el SHA |
| Costo | $0 dentro de límites verificados |

No gana una captura más linda ni más código. Gana la implementación que completa mejor el mismo trabajo real.

## 13. Scorecard inicial

Cada hito comparable se registra por evidencia, no por opinión:

```text
IMPLEMENTED
→ CI VALIDATED
→ RUNTIME VALIDATED
→ MOBILE VALIDATED
→ COMPARABLE
```

Una implementación no puede declararse ganadora de un circuito si la otra se midió con datos reales y ella sólo con mocks.

## 14. Seguridad y datos

Obligatorio para ambos repos:

- anon/publishable keys sólo donde Supabase lo autoriza; secretos privileged nunca en cliente;
- RLS activa y probada para entidades protegidas;
- cambios críticos por autoridad backend/RPC cuando el contrato así lo define;
- chat ligado al `serviceId` exacto;
- no exponer teléfono, WhatsApp, email o links para desintermediar;
- no registrar PII sensible en telemetría de competencia;
- no duplicar PROD ni copiar datos reales a fixtures inseguros.

## 15. Git y release

En ambos repos:

```text
main = única rama de trabajo autorizada
```

No crear ramas paralelas por rutina para esta competencia. No force-push. No reescribir historia. Si `main` avanzó, reconstruir el cambio sobre el HEAD vigente.

Build, runtime y publicación siguen siendo estados separados. Un commit en `main` no equivale a deploy.

## 16. Definition of Done — Competencia Milestone 1

Milestone 1 queda listo para comparación cuando **A y B** puedan ejecutar, en TEST y desde móvil, el mismo circuito:

```text
login/rol
→ crear pedido
→ buscar
→ aceptar proveedor
→ chat bidireccional
→ estado proveedor
→ completar
→ rating
```

Y además:

- cancelación selectiva funciona;
- dos pedidos simultáneos quedan aislados;
- reload/reconnect conserva verdad;
- no hay superposición crítica mobile;
- build aplicable pasa;
- no se introdujo costo pago;
- cada ejecución identifica repo + SHA + entorno.

Recién entonces se compara qué implementación resuelve mejor el circuito y qué partes conviene consolidar.

## 17. Orden de ejecución inmediato

```text
A: continuar P0/P1 actuales sin frenar
B1: corregir shell responsive móvil
B2: preparar configuración Supabase TEST por env
B3: crear capa backend sin romper UI
B4: request real + serviceId
B5: provider online/matching/accept
B6: chat realtime
B7: lifecycle + actividad
B8: cancelación + multi-pedido
B9: cierre/rating
A↔B: portar mejoras demostradas en cada bloque
```

## 18. Regla final

> **Dos implementaciones, una sola realidad UGO. Compiten la experiencia y la ejecución; no compiten los datos, la seguridad ni las reglas de negocio. Ninguna frena a la otra. Cada una aprende de la otra. Todo cambio se demuestra con el mismo E2E y, mientras sea viable, con costo directo $0.**
