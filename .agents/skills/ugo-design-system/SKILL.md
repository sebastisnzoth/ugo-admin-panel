---
name: ugo-design-system
description: UX/UI, Product Design y Design System transversal de UGO. Usar para diseñar, auditar e implementar visualmente Cliente, Proveedor y paneles administrativos; tokens, componentes, responsive, accesibilidad, consistencia visual, contratos de interacción y preparación frontend.
---
# UGO UX / UI / Design System

## Misión
Diseñar, auditar y evolucionar la interfaz gráfica de todo el ecosistema UGO sin crear una segunda autoridad visual. Esta Skill convierte necesidades funcionales, flujos maestros y estado real del producto en experiencias claras, consistentes, accesibles e implementables.

No diseña pantallas aisladas por estética. Diseña recorridos que acerquen UGO a uso real.

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

## Alcance
Esta Skill cubre UX/UI transversal de:

- Cliente
- Proveedor
- Admin
- Super Admin
- superficies públicas/institucionales cuando usen identidad UGO

Incluye:

- jerarquía visual
- layout
- navegación
- componentes
- tokens
- microcopy UX
- estados
- mapas
- radar
- bottom sheets
- formularios/wizards conversacionales
- responsive
- accesibilidad
- feedback
- empty/error/loading/offline
- contratos frontend
- auditoría visual
- consistencia entre roles

No reemplaza las Skills funcionales de Cliente, Proveedor o Admin. Para cambios de producto, trabajar junto a la Skill del dominio afectado y `ugo-qa`.

## Routing esperado

```text
sólo visual/UI                    → ugo-design-system + ugo-qa
Cliente                           → ugo-client + ugo-design-system + ugo-qa
Proveedor                         → ugo-provider + ugo-design-system + ugo-qa
Admin                             → ugo-admin + ugo-design-system + ugo-qa
Cliente↔Proveedor                 → ugo-core + ugo-client + ugo-provider + ugo-design-system + ugo-qa
transversal grande                → ugo-hugo + ugo-core + especialistas necesarios
```

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

Secuencia base de referencia:

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

No mostrar acciones futuras como si ya estuvieran disponibles.

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
Buscar primero:

- tokens
- componentes
- layouts
- cards
- navegación
- iconografía
- modales
- bottom sheets
- patrones de feedback

Crear una pieza nueva sólo cuando lo existente no resuelva correctamente el problema.

### 5. Diseñar
Definir:

- jerarquía
- layout
- CTA
- copy
- componentes
- interacción
- estados
- responsive
- accesibilidad

### 6. Traducir a contrato frontend
Cuando corresponda, entregar algo equivalente a:

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

### 7. Validar
Preguntarse:

```text
¿Se entiende sin explicación?
¿La acción principal es obvia?
¿Refleja estado real?
¿Funciona vacío?
¿Funciona con error?
¿Funciona offline/degradado cuando aplique?
¿Funciona con teclado y safe areas?
¿Respeta Design System?
¿Duplica algo existente?
¿Acerca al usuario a completar una operación real?
```

## Design System
Buscar y reutilizar tokens/componentes existentes antes de crear nuevos.

No introducir un segundo sistema visual ni CSS puntual que contradiga la base global.

Mantener una única intención por componente compartido.

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
Preferir escalas consistentes ya existentes. Si el sistema requiere referencia, usar múltiplos coherentes como:

```text
4 8 12 16 20 24 32 40 48 64
```

No introducir márgenes/paddings únicos sin necesidad.

## Mobile first y responsive
Referencia principal móvil:

```text
390×844
```

Rango prioritario:

```text
360–430 px
```

Considerar siempre:

- safe areas
- teclado
- scroll
- bottom navigation
- bottom sheets
- orientation cuando aplique
- latencia/conexión degradada

Definir comportamiento para mobile, tablet y desktop cuando la superficie lo requiera. No limitarse a escalar proporcionalmente la versión móvil.

## Áreas táctiles
Targets táctiles:

```text
mínimo UGO: 48×48 px
```

Especial atención a:

- volver
- menú
- avatar
- notificaciones
- filtros
- tabs
- mapa
- navegación inferior
- Hugo/Orbe

## CTA
Cada paso transaccional debe tener una acción primaria inequívoca.

Preferir acciones específicas:

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

Evitar `Continuar` cuando pueda explicarse qué ocurrirá.

No hacer competir visualmente varias acciones primarias.

## Estados obligatorios
Diseñar como mínimo según corresponda:

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

Y los estados de dominio reales del flujo afectado.

No inventar estados visuales para ocultar una capacidad backend inexistente.

## Empty states
Un vacío debe explicar:

- qué significa;
- si es normal;
- qué puede hacer la persona ahora.

Incluir CTA cuando exista acción útil.

## Errores y recuperación
Todo error importante debe explicar:

```text
qué pasó
+ qué se conservó
+ qué puede hacer ahora
```

Nunca obligar a empezar de cero por una falla recuperable.

Evitar mensajes técnicos tipo `Error 500` como experiencia final.

## Feedback
Toda acción importante debe tener respuesta visible:

- guardado
- envío
- aceptación
- rechazo
- pago
- actualización
- retry

Usar según contexto:

- inline feedback
- toast
- banner
- modal
- cambio de estado

Evitar modales encadenados.

## Copy UX
Texto:

- breve
- cotidiano
- accionable
- no técnico
- coherente en ES/PT cuando corresponda

UGO explica lo que el usuario necesita saber, no su arquitectura interna.

## Mapas, radar y bottom sheets
Mapa y radar deben apoyar la acción, no funcionar como decoración.

- evitar saturación de marcadores y controles;
- ofrecer fallback textual cuando corresponda;
- mantener CTA accesible;
- respetar safe areas;
- usar bottom sheet para información contextual sin perder el mapa;
- animaciones sólo si comunican búsqueda, disponibilidad o estado real.

Nunca simular profesionales disponibles o matching inexistente.

## Hugo / Orbe
Hugo/Orbe debe:

- mantener contexto;
- compartir draft entre voz y texto;
- tener target ≥48 px;
- mostrar disponible/escuchando/procesando/confirmación cuando corresponda;
- no tapar CTA, navegación, precio ni información crítica;
- conservar lo capturado si voz falla;
- requerir confirmación visible para decisiones críticas.

## Accesibilidad
Obligatorio revisar:

- contraste WCAG AA;
- texto legible;
- foco visible;
- teclado en web;
- lector de pantalla cuando corresponda;
- labels;
- reduced motion;
- no depender sólo de color o iconos;
- voz como alternativa, nunca obligación;
- texto como alternativa completa.

## Consistencia entre roles
Cuando Cliente y Proveedor representan el mismo objeto del negocio, conservar relación visual y semántica.

Ejemplo:

```text
Cliente solicita servicio
Proveedor recibe oportunidad
Admin observa la misma operación
```

Las tres vistas pueden diferir en acciones, pero deben reflejar la misma realidad persistida y nomenclatura compatible.

## Auditoría visual
Clasificar hallazgos en cuatro ejes:

### UX
- comprensión
- fricción
- continuidad
- navegación
- próxima acción

### UI
- jerarquía
- tipografía
- espaciado
- contraste
- componentes
- estados

### Producto
- CTA
- confianza
- conversión
- información necesaria
- distancia al primer uso real

### Técnica
- reutilización
- tokens
- responsive
- duplicación
- contratos frontend
- coherencia con dominio

## Severidad

### P0
Bloquea uso real o induce estado crítico falso.

Ejemplos:
- no se puede contratar;
- CTA principal inaccesible;
- navegación sin salida;
- pago/estado mostrado de forma incorrecta;
- flujo crítico roto.

### P1
Problema serio de journey, operación o conversión.

Ejemplos:
- jerarquía confusa;
- responsive roto;
- falta feedback;
- recuperación deficiente;
- acción crítica difícil de encontrar.

### P2
Consistencia u optimización importante.

### P3
Polish visual o microinteracción.

Prioridad:

```text
P0 → P1 → P2 → P3
```

## Autonomía
Esta Skill puede decidir sin pedir autorización rutinaria:

- layout
- spacing
- jerarquía
- componente existente más adecuado
- microcopy
- estados UI
- responsive
- orden visual
- ajustes de accesibilidad
- refactors visuales reversibles

Debe escalar según `AGENTS.md` si la decisión implica nueva política de producto, cambio comercial, dinero, permisos, seguridad, funcionalidad irreversible o contradicción entre maestros.

## No hacer
Nunca:

- diseñar por estética sin objetivo;
- crear una segunda autoridad visual;
- inventar APIs, datos o disponibilidad;
- inventar estados de dominio;
- romper un flujo maestro para acomodar una pantalla;
- duplicar componentes sin revisar lo existente;
- esconder problemas backend con UI ficticia;
- sacrificar usabilidad por efectos visuales;
- usar inspiración externa como copia literal.

## Definition of Done UI
Una interfaz crítica está terminada cuando, según aplique:

```text
[ ] respeta maestros UX y flujo funcional
[ ] refleja estado real del dominio
[ ] CTA principal clara
[ ] jerarquía comprensible
[ ] loading diseñado
[ ] empty diseñado
[ ] error/recovery diseñado
[ ] disabled/submitting/success cubiertos
[ ] mobile 390×844 validado
[ ] teclado y safe areas revisados
[ ] responsive definido
[ ] targets ≥48 px
[ ] contraste/accessibility revisados
[ ] navegación anterior/siguiente coherente
[ ] reutiliza tokens/componentes
[ ] no crea sistema paralelo
[ ] contrato frontend implementable
[ ] puede ser usada por una persona real sin explicación adicional
```

## Output esperado
Cuando la tarea sea de diseño o auditoría UI/UX, producir de forma proporcional:

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
contrato frontend
archivos afectados
severidad P0/P1/P2/P3
validación ejecutada o pendiente real
```

## Validación
Comparar con los maestros UX/usabilidad y referencias vigentes; probar breakpoints/journeys afectados y estados de error/disabled.

Ejecutar gates aplicables del repo cuando haya implementación:

```bash
npm run build
npm test
npm run lint
```

No declarar `VALIDATED` sin evidencia de la ejecución exacta.

## Regla final
> **UGO no necesita más pantallas: necesita recorridos más claros. La interfaz debe convertir una necesidad real en una acción obvia, reflejar siempre la verdad del dominio y reducir la distancia entre la persona y la resolución completa del servicio.**
