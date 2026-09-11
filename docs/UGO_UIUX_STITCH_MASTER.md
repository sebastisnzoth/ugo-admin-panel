# UGO — UI/UX Master · Google Stitch

**Documento maestro de diseño del ecosistema UGO**  
**Versión:** 1.1 · 11 de septiembre de 2026  
**Estado:** contrato vivo · fuente de verdad para diseño, prototipado e implementación  
**Herramienta de diseño asistido:** Google Stitch  
**Complementa:** `docs/UGO_ECOSISTEMA_FLUJO.md` y `docs/UGO_UIUX_MAESTRO.md`

> Este documento traduce el producto UGO a un contrato UI/UX utilizable por personas, Google Stitch y agentes de implementación. Integra además las características valiosas auditadas de las ramas históricas `feat/client-ui-stitch`, `feat/client-web-stitch`, `feat/client-ui-stitch-sync` y `feat/admin-superadmin-stitch-sync`. Stitch no crea un UGO alternativo: ayuda a diseñar mejor el UGO real.

---

# 1. Principio rector

## Estado → contexto → próxima acción

Toda pantalla debe responder:

1. ¿Qué está pasando?
2. ¿Qué significa para este usuario?
3. ¿Qué debe hacer ahora?

Circuito maestro:

```text
Necesidad → búsqueda → matching → contratación → pago → ejecución → evidencia → aprobación → cobro → reputación → datos → inteligencia → mejora
```

---

# 2. Uso obligatorio con Google Stitch

```text
Flujo maestro UGO
→ UI/UX Master
→ prompt de pantalla Stitch
→ propuesta visual
→ revisión contra contratos UGO
→ adaptación al Design System real
→ React/CSS
→ Supabase/Realtime/RLS reales
→ prueba responsive + estados + accesibilidad
```

Stitch puede proponer composición, jerarquía, responsive, motion y presentación. No puede alterar estados reales, roles, seguridad, pagos, RLS, navegación funcional ni contratos del servicio.

## 2.1 Contexto mínimo de todo prompt

```text
Producto: UGO
Marketplace de servicios locales bajo demanda
Design language: Kinetic Trust
Estética: moderna, confiable, tecnológica, humana, operacional
Mobile reference: 390 × 844
Mobile range: 360–430 px
Touch targets: mínimo 48 × 48
Regla UX: Estado → contexto → próxima acción
Primary: verde UGO
Hugo/IA: cyan/secondary
Tipografía: Plus Jakarta Sans
Grid: 8pt con half-step de 4px
Safe areas obligatorias
No inventar funciones ni estados
No sustituir lógica React/Supabase con HTML generado
```

---

# 3. Kinetic Trust · lenguaje visual consolidado

Características rescatadas de Stitch y adoptadas como contrato:

- marketplace moderno de alta confianza;
- claridad operacional y tiempo real;
- mapas como contexto de decisión;
- seguridad y confianza visibles como producto;
- superficies limpias y táctiles;
- profundidad suave, no decoración excesiva;
- actividad live expresada mediante pulsos/radar cuando exista dato real;
- diseño hiperl local apropiado para mercados latinoamericanos;
- interfaz cálida sin perder precisión técnica.

Glass/frosted surfaces pueden usarse de forma **suave y funcional** en mapas, navegación y Hugo. Nunca deben reducir contraste, legibilidad ni convertirse en glassmorphism decorativo generalizado.

---

# 4. Design System maestro

La fuente de implementación es `src/mvp/ugo-design-system.css` y las primitivas compartidas.

## 4.1 Tokens canónicos

```text
Primary / confianza       #006948
Primary container         #00855d
Secondary / Hugo          #00687a
Secondary cyan accent     #57dffe
Tertiary / información    #0058be
Error                     #ba1a1a
Warning / rating          #b45309
Surface                   #faf8ff
Surface lowest            #ffffff
On surface                #131b2e
Outline variant           #bccac0
```

Los antiguos cyan-first de Stitch Web son referencias históricas, no reemplazan el verde canónico. Cyan queda reservado principalmente para Hugo, información contextual, actividad live y acentos cartográficos.

## 4.2 Tipografía

Plus Jakarta Sans como principal.

```text
Display        36/44 · 800
Headline L     30/38 · 700
Headline L mob 26/32 · 700
Headline M     22/28 · 700
Headline S     18/24 · 600
Title          16/22 · 600
Body L         16/24
Body M         14/20
Body S         13/18
Label L        14/20 · 600
Label M        12/16 · 600
Label S        11/14 · 700
```

## 4.3 Espaciado y geometría

```text
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40
mobile edge margin 16
mobile/tablet expanded margin 24
touch target 48
safe bottom Android 24
control radius 12
card radius 16–24
sheet radius 24
pill/avatar full
```

## 4.4 Componentes Stitch adoptados

- Primary Hero Button: ancho completo cuando es CTA dominante, altura aproximada 52 px.
- Icon Button: hit area circular 48 px.
- Search Bar: icono + input + acción de micrófono/Hugo cuando corresponda.
- Service Category Tiles: grid compacto de 4 columnas en mobile cuando el ancho lo permita.
- Map Marker Card: avatar, live state, nombre, rating, ETA y categoría.
- Hugo Context Banner: superficie ligera/frosted con estado live y preview contextual.
- Bottom Navigation: superficie fija, targets 48 px y estado activo inequívoco.

Componentes canónicos generales:

```text
Button · IconButton · Input · Search · Card · Badge · Avatar
TopBar · BottomNavigation · BottomSheet · Drawer · Modal
FloatingActionButton · EmptyState · ErrorState · RetryState
SuccessState · OfflineState · StatusCard · ServiceCard
ProviderCard · PaymentStatus · EvidenceCard · Timeline
MapPanel · ActionSheet · HugoDock · NotificationItem
AlertCard · KpiCard · DecisionCard
```

---

# 5. Responsive maestro

## Mobile 360–767

- experiencia primaria;
- bottom navigation;
- bottom sheets;
- CTA alcanzable con una mano;
- safe areas;
- mapa + sheet en vez de layouts desktop comprimidos.

## Tablet 768–1279

- gutters 24 px;
- mayor uso de dos columnas;
- sidebar colapsable cuando corresponda;
- sheets pueden transformarse en panels.

## Desktop ≥1280

Característica rescatada de Stitch Web: **UGO debe ser una aplicación web real, no un teléfono agrandado**.

- sidebar persistente en superficies complejas;
- topbar + main canvas;
- mapa/contenido en split view cuando aporte valor;
- panels de detalle laterales;
- densidad superior sin perder jerarquía.

---

# 6. Cliente · journey Stitch consolidado

Navegación:

```text
Inicio · Servicios · Actividad · Perfil
```

Journey de referencia auditado:

```text
Home
→ Buscar servicio
→ Nueva solicitud
→ Matching en vivo
→ Profesional seleccionado
→ Contratación / pago
→ Servicio en camino
→ Chat en vivo
→ Llegada al domicilio
→ Servicio en ejecución
→ Ampliar servicio
→ Cierre / comprobante
→ Revisión final
→ Actividad
→ Perfil / Configuración / Ayuda
```

## 6.1 Home / Radar

Jerarquía:

1. ubicación;
2. búsqueda/Hugo;
3. categorías;
4. profesionales/disponibilidad;
5. servicio activo;
6. actividad secundaria.

Mapa + bottom sheet es el patrón mobile prioritario. Los elementos live deben representar datos reales.

## 6.2 Solicitud

```text
Servicio
→ detalles + fotos
→ dirección + cuándo
→ presupuesto/resumen
→ confirmar
```

Las fotos previas son parte del formulario y permiten al proveedor analizar el trabajo antes de aceptar.

## 6.3 Matching en vivo

No usar spinner infinito. Mostrar categoría/zona, búsqueda activa, actividad/progreso disponible, alternativas y recuperación.

## 6.4 Profesional seleccionado

Mostrar identidad, verificación, rating, especialidad, ETA/distancia, tarifa/valor y CTA dominante.

## 6.5 Servicio activo

Integrar en una misma narrativa:

```text
estado + proveedor + mapa/ETA + conversación + pago + evidencia
+ ampliar trabajo + ayuda/disputa + próxima acción
```

## 6.6 Chat en vivo

La conversación es contextual al servicio. Debe conservar identidad de participantes, estado del servicio y acceso a acciones relevantes sin transformarse en una app de mensajería separada.

## 6.7 UGO Shield

Concepto Stitch adoptado para agrupar señales de confianza: verificación, trazabilidad, evidencia, soporte y protección cuando realmente aplique. Nunca prometer protección electrónica en efectivo.

---

# 7. Pagos · características Stitch integradas

Superficies de referencia:

```text
Contratación con saldo
Recarga de billetera
Comprobante fiduciario / comprobante de pago
Pagos
```

Estas superficies son patrones UX; sólo se activan cuando el backend real soporte la función correspondiente.

Electrónico:

```text
pendiente → confirmado → protegido → liberación pendiente → liberado
```

Efectivo:

```text
seleccionado → presencial pendiente → proveedor confirma recepción → registrado
```

Mostrar importe, método, estado, comisión, monto proveedor, protección o ausencia de ella, fecha y próxima acción.

---

# 8. Proveedor

Navegación:

```text
Inicio · Demanda · Trabajos · Perfil
```

Inicio responde **¿Qué tengo que hacer ahora?**

Demanda responde **¿Dónde hay trabajo para mí?** y representa panorama, zonas, categorías, volumen, urgencia, distancia, valor y tendencia.

Oportunidades son trabajos concretos compatibles y muestran categoría, zona, distancia, antigüedad, descripción, evidencia previa del cliente, valor, compatibilidad y Aceptar/Rechazar.

Misión activa:

```text
Pago autorizado/efectivo seleccionado
→ En camino
→ Llegué
→ Evidencia antes
→ Iniciar
→ En progreso
→ Ampliar si hace falta
→ Evidencia durante/después
→ Finalizar
→ Aprobación
→ Cobro
```

Hugo funciona como Asistente de Trabajo contextual antes, durante y después.

---

# 9. Evidencia y ampliación

Evidencia previa del cliente y evidencia operacional son conceptos distintos.

```text
Solicitud: fotos del trabajo → proveedor analiza antes de aceptar
Operación: Antes → Durante → Después
```

Agregar trabajo / Ampliar servicio:

```text
necesidad adicional → propuesta → descripción → costo/tiempo extra
→ cliente aprueba/rechaza → ajuste trazable → servicio continúa
```

Nunca ocultar costo, tiempo, autor ni estado.

---

# 10. Admin / Super Admin

Admin responde **¿Qué requiere atención y qué decisión debo tomar?**

```text
Contexto → KPIs esenciales → prioridades/alertas → mapa/lista
→ detalle → acción → confirmación/auditoría
```

Super Admin gobierna roles, permisos, feature flags, categorías, zonas, matching, finanzas, Scout, Hugo, integraciones, auditoría y métricas globales.

Los inventarios Stitch Admin/Super Admin se consideran referencia visual y de cobertura, pero la autoridad funcional sigue siendo el flujo maestro y `main`.

---

# 11. Scout y Academia

Scout:

```text
Dato → interpretación → recomendación → acción → resultado
```

No es BI pasivo. Debe mostrar gaps de oferta/demanda, tendencias, conversión, campañas, alertas y CTA accionable.

Academia:

```text
Diagnóstico → ruta → contenido → evaluación → progreso/certificación
→ impacto en perfil/oportunidades
```

---

# 12. Mapas

Cliente: ubicación, proveedores, tracking, ETA.  
Proveedor: demanda, oportunidades, ruta.  
Admin: operación, concentración, incidencias, cobertura.  
Scout: patrones, gaps, oportunidades.

Reglas:

- contexto textual siempre;
- no depender sólo de color/pin;
- selected state inequívoco;
- fallback lista;
- controles 48 px;
- atribución cartográfica;
- marker cards pueden mostrar avatar + live + rating + ETA + categoría.

---

# 13. Estados, accesibilidad y motion

Todo dato:

```text
loading → loaded
        ↘ empty
        ↘ error → retry
        ↘ offline/degraded
```

Toda mutación:

```text
idle → submitting → success
                  ↘ error → recovery
```

Motion sólo explica estado, jerarquía o actividad real. Pulsos/radar se permiten para matching, proveedor live y Hugo, respetando `prefers-reduced-motion`.

Contraste WCAG AA, foco visible, teclado en web, labels accesibles, texto no menor a 12 px salvo metadata excepcional y no depender sólo del color.

---

# 14. Regla de integración de exports Stitch

El HTML generado por Stitch es **material de diseño/referencia**, no código de producción para copiar íntegramente.

Nunca:

- iframear un export como aplicación;
- sustituir React/Supabase por HTML demo;
- copiar datos mock como reales;
- duplicar routing;
- introducir un segundo Design System.

Sí:

- extraer jerarquía visual;
- adaptar layouts;
- rescatar estados UX;
- convertir patrones a componentes UGO;
- reutilizar ideas responsive;
- validar cada pantalla contra backend y flujo real.

---

# 15. Inventario Stitch que debe preservarse como referencia

De las ramas auditadas se preservan conceptualmente:

### Cliente Mobile

- Home / Home UX Cleanup
- Buscar servicio
- Nueva solicitud
- Matching en vivo
- Profesional seleccionado
- Servicio en camino
- Chat en vivo
- Llegada al domicilio
- Servicio en ejecución
- Ampliar servicio
- Pagos y cierre
- Actividad
- Perfil / Configuración / Ayuda
- UGO Shield
- revisión final

### Cliente Web

Mismo journey, adaptado a shell responsive real:

```text
desktop: sidebar + topbar + canvas / split map
mobile: off-canvas + bottom sheets + bottom nav
```

### Admin / Super Admin

Inventarios Stitch históricos se usan para comprobar cobertura de pantallas y consistencia, nunca para reemplazar lógica actual.

---

# 16. Plantilla maestra para prompts Stitch

```text
Diseñá una pantalla de UGO siguiendo el documento UGO_UIUX_STITCH_MASTER.

Rol: [Cliente / Proveedor / Admin / Super Admin]
Pantalla: [nombre]
Estado funcional: [estado real]
Objetivo del usuario: [objetivo]
Próxima acción principal: [CTA]

Aplicar Kinetic Trust.
Usar Plus Jakarta Sans, Design System UGO, touch targets >=48px,
grid 8pt, safe areas, estados loading/empty/error/success y responsive real.

Mobile reference 390x844.
En desktop no agrandar un teléfono: usar shell web real, sidebar/topbar,
panels y split map cuando corresponda.

Si hay mapa, incluir contexto textual y fallback.
Si hay Hugo, usar cyan/secondary y hacerlo contextual.
Si hay dinero, distinguir estado y protección con precisión.
Si hay evidencia, diferenciar solicitud previa de Antes/Durante/Después.

No inventar funciones ni estados.
No alterar contratos de pagos, seguridad, RLS o navegación.
No generar un sistema visual alternativo.
La pantalla debe responder: Estado → contexto → próxima acción.
```

---

# 17. Definition of Done Stitch → UGO

Una pantalla sólo está lista cuando:

- coincide con el flujo maestro;
- respeta el rol;
- usa tokens/componentes UGO;
- mantiene Estado → contexto → próxima acción;
- funciona 360–430 mobile y responsive web;
- desktop es una app real, no mobile estirado;
- touch targets ≥48 px;
- safe areas correctas;
- loading/empty/error/retry/offline diseñados;
- pagos usan términos correctos;
- efectivo nunca se llama protegido;
- evidencia previa y operacional están diferenciadas;
- mapa tiene fallback;
- Hugo es contextual;
- accesibilidad AA y reduced motion;
- no contiene mocks presentados como datos reales;
- conserva React/Supabase/RLS/Realtime existentes;
- build/TypeScript pasan antes de merge.

---

# 18. Regla final

**Stitch no crea un UGO alternativo. Stitch ayuda a diseñar mejor el UGO real.**

Toda propuesta visual debe converger hacia una experiencia única, confiable, trazable y escalable para Cliente, Proveedor, Admin, Super Admin, Scout, Hugo y Academia.