---
name: ugo-design-system
description: UX/UI, Product Design y Design System transversal de UGO. Usar para diseñar, auditar, crear mockups/assets e implementar visualmente Cliente, Proveedor y paneles administrativos; tokens, componentes, responsive, accesibilidad, consistencia visual, contratos de interacción y preparación frontend.
---
# UGO UX / UI / Design System

## Misión
Diseñar, auditar y evolucionar la interfaz gráfica de todo el ecosistema UGO sin crear una segunda autoridad visual. Esta Skill convierte necesidades funcionales, flujos maestros y estado real del producto en experiencias claras, consistentes, accesibles e implementables.

Puede crear diseño gráfico, wireframes, mockups, especificaciones y assets cuando eso reduzca retrabajo o permita validar una solución antes de implementarla. No diseña pantallas aisladas por estética: diseña recorridos que acerquen UGO a uso real.

## Pregunta obligatoria
Antes de priorizar un cambio visual importante y después de cada auditoría relevante, responder internamente:

> **¿Qué impide hoy que esta interfaz ayude a conseguir o atender al primer cliente real de UGO?**

Si existe un bloqueo P0/P1 de adquisición, onboarding, solicitud, matching, confianza, ejecución, pago, cierre o soporte, tiene prioridad sobre polish visual.

## Autoridades
Antes de inventar patrones, consultar en este orden proporcional al trabajo:

- `AGENTS.md`
- `docs/UGO_MASTER_INDEX.md`
- `UGO_PLAN_MAESTRO_UX_FLUJOS_VALIDADO.md`
- `docs/UGO_ECOSISTEMA_FLUJO.md`
- `docs/UGO_UIUX_MAESTRO.md`
- `docs/UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md`
- maestro funcional afectado
- `docs/UGO_DESIGN_SYSTEM_INVENTORY.md`
- código y componentes actuales en `main`

La UI nunca debe contradecir lifecycle, permisos, pagos, disponibilidad, evidencia ni estados persistidos.

## Principios operacionales
Toda superficie crítica debe responder:

```text
¿Dónde estoy?
¿Qué está pasando?
¿Qué hago ahora?
```

Patrón obligatorio:

```text
Estado → contexto → próxima acción
```

Principios:
- Pedir un servicio debe sentirse tan simple como pedir un viaje.
- Una persona sin conocimiento técnico debe poder usar UGO sin explicación previa.
- Simplificar interacción, no falsificar contratos del dominio.
- Una intención dominante por pantalla cuando el journey sea secuencial.
- Reutilizar antes de crear.
- Mobile first para Cliente y Proveedor.
- Cliente, Proveedor y Admin comparten lenguaje visual sin forzar interfaces idénticas.
- Diseñar el journey completo, no solamente la captura bonita.
- Código existente es evidencia de implementación; los maestros siguen siendo autoridad.

## Alcance
Esta Skill cubre UX/UI transversal de:
- Cliente
- Proveedor
- Admin
- Super Admin
- superficies públicas/institucionales que usen identidad UGO

Incluye:
- jerarquía visual y layout;
- navegación;
- componentes y tokens;
- microcopy UX;
- estados;
- mapas/radar;
- bottom sheets;
- wizards conversacionales;
- responsive;
- accesibilidad;
- feedback;
- empty/error/loading/offline;
- contratos frontend;
- auditoría visual;
- consistencia entre roles;
- wireframes;
- mockups de alta fidelidad;
- variantes gráficas;
- ilustraciones/assets funcionales o institucionales.

No reemplaza las Skills funcionales de Cliente, Proveedor o Admin. Para cambios de producto, trabajar junto a la Skill del dominio afectado y `ugo-qa`.

## Routing esperado

```text
sólo visual/UI                    → ugo-design-system + ugo-qa
Cliente con UI/UX                 → ugo-client + ugo-design-system + ugo-qa
Proveedor con UI/UX               → ugo-provider + ugo-design-system + ugo-qa
Admin con UI/UX                   → ugo-admin + ugo-design-system + ugo-qa
Cliente↔Proveedor con UI          → ugo-core + ugo-client + ugo-provider + ugo-design-system + ugo-qa
transversal grande                → ugo-hugo + ugo-core + especialistas necesarios
```

Cambios puramente funcionales que no alteran UI no necesitan activar esta Skill.

## Flujo Cliente como contrato UX
Home tiene intención dominante:

```text
¿Qué necesitás?
```

Entradas equivalentes:

```text
voz ─┐
texto├→ mismo draft → Hugo interpreta → UI refleja → cliente confirma
categoría/búsqueda ┘
```

No crear flujos paralelos para voz, texto, categoría o búsqueda.

Objetivo habitual para una solicitud común: 3–5 confirmaciones humanas antes del matching cuando el contexto lo permita.

Secuencia base:

```text
necesidad
→ evidencia si aporta valor
→ cuándo / ubicación si falta
→ revisión de lo entendido
→ encontrar profesionales
→ matching
→ seguimiento
→ pago/cierre
→ valoración
```

No congelar una composición visual específica del Home si el flujo maestro vigente requiere otra organización.

## Flujo Proveedor como contrato UX
La Home debe responder:

```text
¿Qué tengo que hacer ahora?
```

Trabajo activo como checklist progresivo y sólo con acciones válidas:

```text
En camino
Llegué
Foto inicial
Iniciar
Trabajar
Ampliar si corresponde
Foto final
Confirmar efectivo cuando corresponda
Finalizar / revisión
```

No mostrar acciones futuras como disponibles.

## Contrato de pantalla
Toda pantalla nueva o rediseñada debe poder responder, proporcionalmente:

```text
SCREEN
PURPOSE
USER
ENTRY POINT
PRIMARY ACTION
SECONDARY ACTIONS
INFORMATION HIERARCHY
COMPONENTS
DOMAIN STATE
UI STATES
ERROR / RECOVERY
EMPTY STATE
LOADING STATE
SUCCESS STATE
NAVIGATION
NEXT SCREEN
RESPONSIVE BEHAVIOR
ACCESSIBILITY
```

Una pantalla crítica que sólo describe el happy path se considera incompleta.

## Proceso de diseño

### 1. Inspeccionar
Antes de diseñar:
- leer maestros y Skills relevantes;
- leer `docs/UGO_DESIGN_SYSTEM_INVENTORY.md`;
- revisar `main`;
- inspeccionar pantallas relacionadas;
- buscar tokens/componentes existentes;
- identificar rutas, estado y contratos afectados.

### 2. Entender objetivo
Determinar:

```text
usuario
necesidad
problema
acción principal
resultado esperado
estado real del dominio
```

### 3. Revisar journey
Siempre analizar:

```text
pantalla anterior
→ pantalla actual
→ pantalla siguiente
```

No resolver una pantalla rompiendo continuidad.

### 4. Reutilizar
Buscar primero tokens, componentes, layouts, cards, navegación, iconografía, modales, bottom sheets y patrones de feedback.

Crear una pieza nueva sólo cuando lo existente no resuelva correctamente el problema.

### 5. Elegir modo de diseño

#### Code-first
Usar cuando:
- el patrón ya existe;
- la modificación es pequeña;
- tokens/componentes están definidos;
- el riesgo UX es bajo.

#### Mockup/spec-first
Usar cuando:
- la pantalla es nueva o cambia sustancialmente;
- existen varias jerarquías plausibles;
- mapa/radar/bottom sheet necesita validación de composición;
- el journey es crítico;
- implementar directo probablemente cause retrabajo.

La Skill puede generar el diseño gráfico necesario sin pedir permiso rutinario cuando el pedido ya autoriza diseñar/mejorar la interfaz.

### 6. Diseñar
Definir:
- jerarquía;
- layout;
- CTA;
- copy;
- componentes;
- interacción;
- estados;
- responsive;
- accesibilidad;
- assets gráficos sólo cuando aportan valor funcional o de marca.

### 7. Traducir a contrato frontend
Cuando corresponda:

```text
Component
Props
State
Events
Navigation
API/domain dependencies
Responsive
Accessibility
Error/recovery states
```

Un mockup no es implementación. Siempre mapearlo a componentes/estados reales antes de declararlo listo para producción.

### 8. Validar
Preguntarse:

```text
¿Se entiende sin explicación?
¿La acción principal es obvia?
¿Refleja estado real?
¿Funciona vacío?
¿Funciona con error?
¿Funciona offline/degradado cuando aplica?
¿Funciona con teclado y safe areas?
¿Respeta el inventario del Design System?
¿Duplica algo existente?
¿Acerca al usuario a completar una operación real?
```

Aplicar `ugo-qa` antes de declarar validada una interfaz crítica.

## Diseño gráfico y assets
Esta Skill puede crear:
- wireframes;
- mockups high-fidelity;
- variantes de layout;
- assets de marca;
- ilustraciones funcionales;
- imágenes institucionales/promocionales del ecosistema;
- referencias visuales para implementación.

Reglas:
- preferir iconografía existente para controles funcionales;
- no usar una imagen como único control de una acción crítica;
- evitar texto embebido en raster si debe traducirse o ser accesible;
- mantener alt/fallback cuando corresponda;
- no inventar profesionales, disponibilidad, garantías, pagos o confianza inexistente;
- los assets deben respetar el Design System y no crear una identidad paralela.

## Design System
`docs/UGO_DESIGN_SYSTEM_INVENTORY.md` es el inventario canónico operativo.

Buscar y reutilizar tokens/componentes existentes antes de crear nuevos. No introducir un segundo sistema visual ni CSS puntual que contradiga la base global.

Tokens deben representar intención semántica, por ejemplo:

```text
color-primary
color-success
color-warning
color-danger
surface-primary
surface-elevated
text-primary
text-secondary
border-default
border-focus
spacing-*
radius-*
shadow-*
```

No usar valores arbitrarios cuando exista un token equivalente.

## Espaciado
Escala de referencia cuando no exista token consolidado:

```text
4 8 12 16 20 24 32 40 48 64
```

## Mobile first y responsive
Referencia móvil:

```text
390×844
```

Rango prioritario:

```text
360–430 px
```

Considerar safe areas, teclado, scroll, bottom navigation, bottom sheets, latencia/conexión degradada y desktop/tablet cuando la superficie lo requiera.

## Áreas táctiles

```text
mínimo UGO: 48×48 px
```

Especial atención a volver, menú, avatar, notificaciones, filtros, tabs, mapa, navegación inferior y Hugo/Orbe.

## CTA
Cada paso transaccional debe tener una acción primaria inequívoca.

Preferir acciones específicas como:

```text
Encontrar profesionales
Solicitar servicio
Enviar presupuesto
Aceptar trabajo
Marcar que llegué
Confirmar pago
Finalizar servicio
Calificar
```

Evitar `Continuar` cuando pueda decirse qué ocurrirá.

## Estados obligatorios
Diseñar según corresponda:

```text
idle
loading
loaded
empty
submitting
success
error
retry
offline/degraded
disabled
```

Y siempre mapear los estados reales del dominio. No inventar estados visuales para ocultar backend inexistente.

## Empty / error / feedback
Un vacío debe explicar qué significa y qué puede hacer la persona.

Todo error importante debe explicar:

```text
qué pasó
+ qué se conservó
+ qué puede hacer ahora
```

Toda acción importante debe tener respuesta visible. Evitar modales encadenados.

## Copy UX
Texto breve, cotidiano, accionable, no técnico y preparado para ES/PT. UGO explica lo que la persona necesita saber, no su arquitectura interna.

## Mapas, radar y bottom sheets
Mapa/radar apoyan acción o seguimiento, no decoración.

- fallback textual cuando corresponda;
- CTA accesible;
- safe areas;
- bottom sheet para contexto sin perder mapa;
- animaciones sólo cuando comuniquen búsqueda/disponibilidad/estado real;
- nunca simular profesionales disponibles o matching.

## Hugo / Orbe
Debe mantener contexto, compartir draft voz/texto, tener target ≥48 px, mostrar estados reales de escucha/proceso/confirmación, no tapar información crítica y conservar lo capturado si voz falla.

## Accesibilidad
Revisar:
- WCAG AA;
- legibilidad;
- foco visible;
- teclado web;
- lector de pantalla cuando corresponda;
- labels;
- reduced motion;
- no depender sólo de color/iconos;
- voz como alternativa, nunca obligación;
- texto como alternativa completa.

## Consistencia entre roles
Cliente, Proveedor y Admin pueden mostrar acciones diferentes sobre la misma operación, pero deben reflejar la misma realidad persistida y nomenclatura compatible.

## Auditoría visual
Clasificar en:

### UX
comprensión, fricción, continuidad, navegación, próxima acción.

### UI
jerarquía, tipografía, espaciado, contraste, componentes, estados.

### Producto
CTA, confianza, conversión, información necesaria, distancia al primer uso real.

### Técnica
reutilización, tokens, responsive, duplicación, contratos frontend, coherencia con dominio.

## Severidad

```text
P0 → bloqueo de uso real / estado crítico falso
P1 → journey, operación, conversión o responsive/accesibilidad crítica
P2 → consistencia, reutilización, deuda visual
P3 → polish/microinteracción
```

Prioridad: `P0 → P1 → P2 → P3`.

## Autonomía
Puede decidir sin autorización rutinaria:
- layout;
- spacing;
- jerarquía;
- componente existente;
- microcopy;
- estados UI;
- responsive;
- accesibilidad;
- refactors visuales reversibles;
- crear mockups/wireframes/assets necesarios para validar una interfaz ya autorizada.

Escalar según `AGENTS.md` ante nueva política de producto, dinero, permisos, seguridad, funcionalidad irreversible o contradicción entre maestros.

## No hacer
Nunca:
- diseñar por estética sin objetivo;
- crear una segunda autoridad visual;
- inventar APIs, datos o disponibilidad;
- inventar estados de dominio;
- romper un flujo maestro para acomodar una pantalla;
- duplicar componentes sin revisar el inventario;
- esconder problemas backend con UI ficticia;
- sacrificar usabilidad por efectos;
- copiar literalmente productos externos;
- declarar un mockup como funcionalidad implementada.

## Definition of Done UI

```text
[ ] respeta maestros UX y flujo funcional
[ ] respeta UGO_DESIGN_SYSTEM_INVENTORY.md
[ ] refleja estado real del dominio
[ ] CTA principal clara
[ ] jerarquía comprensible
[ ] loading diseñado
[ ] empty diseñado
[ ] error/recovery diseñado
[ ] disabled/submitting/success cubiertos
[ ] mobile 390×844 validado
[ ] 360–430 sin ruptura crítica
[ ] teclado, scroll y safe areas revisados
[ ] responsive definido
[ ] targets ≥48 px
[ ] contraste/accessibility revisados
[ ] navegación anterior/siguiente coherente
[ ] reutiliza tokens/componentes
[ ] assets gráficos son accesibles y no sustituyen controles críticos
[ ] no crea sistema paralelo
[ ] contrato frontend implementable
[ ] puede ser usada por una persona real sin explicación adicional
```

## Evidencia
Distinguir siempre:

```text
DESIGNED ≠ IMPLEMENTED ≠ VALIDATED ≠ RELEASED
```

Si no existe tooling de regresión visual configurado, no fingirlo. `ugo-qa` debe dejar explícita la parte visual no automatizada.

## Output esperado
Cuando la tarea sea de diseño o auditoría UI/UX, producir proporcionalmente:

```text
objetivo
hallazgo/problema UX
solución propuesta
journey afectado
layout/jerarquía
componentes reutilizados/nuevos
estados
interacciones
responsive/accesibilidad
mockup/asset si aporta valor
contrato frontend
archivos afectados
riesgos P0/P1
validación realizada
```

## Regla final
> **UGO debe verse como un solo producto y comportarse como una sola realidad. Diseñar significa reducir esfuerzo, mostrar estado verdadero y conducir a la próxima acción. El diseño gráfico es una herramienta de producto, no decoración ni sustituto de funcionalidad.**
