# UGO — Inventario Canónico de Design System

**Versión:** 1.0 · 12 de septiembre de 2026  
**Estado:** contrato vivo de inventario visual  
**Rama de verdad:** `main`

> Este documento registra qué piezas visuales son canónicas, qué implementación existe y qué debe reutilizarse antes de crear otra variante. No reemplaza los maestros UX/funcionales: los materializa en un inventario operativo.

## 1. Objetivo

Evitar que Cliente, Proveedor, Admin y Super Admin evolucionen como productos visuales separados.

Antes de crear una pantalla, componente, token, ilustración o asset, responder:

1. ¿ya existe una pieza equivalente?
2. ¿el nuevo elemento reduce fricción o resuelve un estado no cubierto?
3. ¿respeta el flujo y estado real del dominio?
4. ¿puede reutilizarse en más de una superficie sin deformar su propósito?
5. ¿acerca a UGO a conseguir o atender al primer cliente real?

## 2. Autoridades

Orden de consulta proporcional:

```text
AGENTS.md
→ UGO_PLAN_MAESTRO_UX_FLUJOS_VALIDADO.md
→ docs/UGO_ECOSISTEMA_FLUJO.md
→ docs/UGO_UIUX_MAESTRO.md
→ docs/UGO_MAESTRO_USABILIDAD_ECOSISTEMA.md
→ maestro funcional afectado
→ este inventario
→ componentes/tokens reales de main
```

Este inventario no puede legitimar un patrón que contradiga lifecycle, permisos, pagos, evidencia o persistencia.

## 3. Baseline obligatoria

```text
Referencia mobile Cliente/Proveedor: 390×844
Rango prioritario: 360–430 px
Touch target UGO: ≥48×48 px
Contraste: WCAG AA
Safe area inferior de referencia: ≥24 px
Patrón mental: Estado → contexto → próxima acción
CTA primaria: una dominante por paso secuencial
```

Toda UI crítica debe responder en segundos:

```text
¿Dónde estoy?
¿Qué está pasando?
¿Qué hago ahora?
```

## 4. Fuentes de implementación observadas

`src/mvp/client-quantum.css` contiene una implementación actual del journey Cliente y sirve como evidencia de estilos/patrones existentes que deben auditarse antes de duplicarse.

Regla: **código existente es evidencia de implementación, no autoridad superior a los maestros.** Si el código contradice un contrato UX o funcional vigente, se corrige el código.

## 5. Familias canónicas de componentes

### 5.1 App shell / layout
Responsabilidad:
- safe areas;
- viewport;
- scroll;
- teclado;
- regiones de navegación;
- capas mapa/sheet.

No crear shells independientes por pantalla si pueden compartir estructura.

### 5.2 Top bar / ubicación / acciones globales
Debe soportar según rol:
- volver;
- ubicación/contexto;
- menú;
- notificaciones;
- avatar/perfil.

Targets ≥48 px y nunca competir con la acción primaria de la pantalla.

### 5.3 Tipografía
Usar jerarquía semántica, no tamaños arbitrarios por pantalla:
- display/hero cuando realmente corresponda;
- title;
- heading;
- body;
- label;
- caption/helper.

La jerarquía debe sobrevivir a ES/PT y a textos más largos.

### 5.4 Colores semánticos
Los nombres deben expresar intención, no una pantalla específica:

```text
color-primary
color-success
color-warning
color-danger
surface-primary
surface-secondary
surface-elevated
text-primary
text-secondary
text-muted
border-default
border-focus
```

No usar color como único indicador de estado.

### 5.5 Espaciado
Escala de referencia cuando no exista un token consolidado:

```text
4 8 12 16 20 24 32 40 48 64
```

Evitar márgenes/paddings de un solo uso sin razón funcional.

### 5.6 Radios y elevación
Usar pocas familias consistentes para:
- cards;
- fields;
- buttons;
- bottom sheets;
- overlays.

La sombra comunica elevación/contexto, no decoración arbitraria.

### 5.7 Botones / CTA
Variantes conceptuales:
- primary;
- secondary;
- tertiary/text;
- destructive;
- icon action.

Estados mínimos:

```text
idle
pressed/active cuando aplique
focus
submitting/loading
disabled
success/error cuando el patrón lo requiera
```

Preferir copy específico: `Encontrar profesionales`, `Aceptar trabajo`, `Marcar que llegué`, `Finalizar servicio`, etc.

### 5.8 Inputs / búsqueda / composición conversacional
Debe cubrir:
- idle;
- focus;
- filled;
- validation;
- disabled;
- loading/interpretando cuando Hugo interviene;
- error recuperable.

Voz, texto, categoría y búsqueda deben alimentar el mismo draft cuando pertenecen a la misma solicitud.

### 5.9 Cards
Familias a consolidar:
- categoría;
- proveedor;
- oportunidad;
- servicio activo;
- resumen/confirmación;
- historial;
- métrica/admin.

No crear una card nueva sólo por cambiar contenido; primero revisar si cambia realmente el contrato de interacción.

### 5.10 Chips / filtros / tabs
Usar para elección acotada o cambio de vista, no como sustituto de navegación compleja.

Estados seleccionados deben ser distinguibles sin depender sólo del color.

### 5.11 Mapas / Radar
El mapa apoya una decisión o seguimiento; no es decoración.

Debe prever:
- loading;
- sin permiso de ubicación;
- sin resultados;
- error del proveedor de mapas;
- fallback textual;
- selección de marcador;
- sheet/contexto asociado.

Nunca simular disponibilidad o matching.

### 5.12 Bottom sheet
Patrón preferido para contexto sobre mapa o acciones móviles sin perder ubicación espacial.

Debe definir:
- collapsed/peek cuando aplique;
- expanded;
- scroll interno si corresponde;
- dismiss seguro;
- foco/teclado;
- safe area;
- CTA persistente cuando sea crítica.

### 5.13 Bottom navigation
Cliente y Proveedor pueden tener IA/navegación distinta, pero deben compartir lenguaje visual y comportamiento de selección.

No ocultar un servicio activo detrás de navegación ambigua.

### 5.14 Hugo / Orbe
Componente transversal de asistencia contextual.

Debe:
- compartir draft voz/texto;
- mantener contexto;
- mostrar `disponible / escuchando / procesando / necesita confirmación` cuando corresponda;
- target ≥48 px;
- no tapar CTA, navegación, precio o estado crítico;
- degradar a texto sin perder información.

### 5.15 Estado / timeline / stepper
Representa estado real del dominio, no storytelling ficticio.

Cliente y Proveedor pueden tener copy distinto, pero deben mapear al mismo servicio persistido.

### 5.16 Feedback
Patrones disponibles:
- inline;
- helper/error;
- toast;
- banner;
- modal sólo cuando la interrupción es necesaria;
- cambio visible de estado.

Evitar modales encadenados.

### 5.17 Empty / loading / error / offline
Toda superficie crítica debe diseñar los estados que le apliquen.

Error:

```text
qué pasó
+ qué se conservó
+ qué puede hacer ahora
```

Nunca reiniciar una solicitud recuperable por una falla de red.

## 6. Estados UI mínimos

Según aplique:

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

Estos estados de UI no sustituyen estados de dominio.

## 7. Diseño gráfico y creación visual

`ugo-design-system` **está autorizado a crear diseño gráfico** cuando ayude a resolver o validar una interfaz, siempre dentro de los maestros de UGO.

Puede producir:
- wireframes;
- mockups de alta fidelidad;
- variantes de layout;
- especificaciones visuales;
- assets de marca;
- ilustraciones funcionales;
- imágenes institucionales;
- composiciones para landing/publicidad cuando pertenezcan al ecosistema UGO;
- referencias visuales para implementación.

### Regla code-first vs mockup-first

Usar **code-first** cuando:
- el patrón ya existe;
- la modificación es pequeña;
- los componentes/tokens están definidos;
- el riesgo UX es bajo.

Usar **mockup/spec-first** cuando:
- la pantalla es nueva o cambia sustancialmente;
- hay varias jerarquías posibles;
- mapa/radar/bottom sheet requiere validar composición;
- el journey es crítico;
- la implementación directa probablemente generaría retrabajo.

Un mockup aprobado conceptualmente **no se convierte en fuente de verdad del dominio**. Debe traducirse a contrato frontend y estados reales.

### Assets generados

- Preferir iconografía del sistema existente para controles funcionales.
- No usar imágenes generadas como único medio para comunicar una acción crítica.
- Mantener alt/fallback cuando corresponda.
- Evitar texto embebido en imágenes cuando deba traducirse, escalar o ser accesible.
- No inventar sellos, garantías, profesionales, disponibilidad ni datos de confianza.

## 8. Contrato de pantalla

Para pantallas nuevas/rediseñadas registrar proporcionalmente:

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
EMPTY
LOADING
SUCCESS
NAVIGATION
NEXT SCREEN
RESPONSIVE
ACCESSIBILITY
```

## 9. Reglas de reutilización

Antes de agregar un componente o token:

```text
buscar → comparar intención → reutilizar/parametrizar → sólo entonces crear
```

No duplicar por diferencias cosméticas menores.

Si dos componentes divergen porque representan acciones/estados realmente distintos, documentar la diferencia.

## 10. Auditoría de consistencia

Clasificar hallazgos:

```text
P0 bloqueo de uso real / estado crítico falso
P1 journey, conversión, operación o responsive crítico
P2 consistencia, deuda visual o reutilización
P3 polish/microinteracción
```

Revisar especialmente:
- componentes duplicados;
- tokens hardcodeados repetidos;
- CTA inconsistentes;
- estados faltantes;
- navegación divergente;
- contraste;
- touch targets;
- safe areas;
- copy técnico;
- mockups que prometen capacidades inexistentes.

## 11. Definition of Done visual

```text
[ ] respeta maestros y flujo funcional
[ ] refleja estado real
[ ] CTA principal inequívoca
[ ] jerarquía comprensible en 3 segundos
[ ] loading/empty/error/recovery cubiertos
[ ] submitting/disabled/success cubiertos si aplica
[ ] 390×844 validado cuando es mobile
[ ] 360–430 sin ruptura crítica
[ ] teclado, scroll y safe areas revisados
[ ] targets ≥48 px
[ ] contraste/accessibility AA
[ ] navegación anterior/siguiente coherente
[ ] reutiliza piezas canónicas
[ ] no crea segunda autoridad visual
[ ] contrato frontend implementable
[ ] assets gráficos no sustituyen controles accesibles
[ ] persona real puede completar la acción sin explicación externa
```

## 12. Automatización visual

El repositorio no debe presumir Storybook, Playwright visual o snapshots si no están instalados/configurados.

Cuando exista tooling visual, `ugo-qa` debe usarlo. Mientras no exista, cualquier validación visual no ejecutada debe reportarse como pendiente, no como `OK` implícito.

La incorporación futura de Storybook/regresión visual debe justificarse por reducción real de regresiones/retrabajo y mantener el criterio de costo controlado.

## 13. Regla final

> **UGO debe verse como un solo producto y comportarse como una sola realidad. Diseñar significa reducir esfuerzo, hacer visible el estado verdadero y conducir a la próxima acción. Crear diseño gráfico es válido cuando sirve a esa experiencia; nunca para tapar una capacidad que todavía no existe.**
