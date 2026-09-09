# UGO — Especificación técnica UI/UX

## Dirección de producto

UGO debe sentirse como una aplicación móvil **minimalista, inmediata, fácil y amigable**, inspirada en la simplicidad operativa de Uber, pero aplicada a servicios.

La referencia no es copiar Uber visualmente. La referencia es su lógica de uso:

```text
abrir app
→ entender qué hacer en segundos
→ elegir una acción
→ confirmar
→ seguir el estado
→ terminar
```

UGO ya funciona. Este trabajo rediseña la experiencia sin rehacer backend, pagos, Supabase, mapas ni lógica de negocio.

Repositorio:

```text
sebastisnzoth/ugo-admin-panel
```

Stack actual:

```text
React 19
TypeScript
Vite
Supabase
TomTom / MapLibre
Mercado Pago
```

---

# 1. Principios de diseño no negociables

## 1.1 Minimalismo funcional

Cada pantalla debe mostrar únicamente lo necesario para tomar la próxima decisión.

Regla:

```text
1 objetivo principal por pantalla
1 CTA principal
máximo 2 acciones secundarias visibles
```

Eliminar:

- bloques decorativos innecesarios;
- textos explicativos largos;
- múltiples cajas compitiendo entre sí;
- dashboards densos en mobile;
- exceso de badges;
- sombras pesadas;
- gradientes innecesarios;
- bordes por todos lados;
- múltiples colores de acción.

## 1.2 Fácil de entender

Un usuario nuevo debe comprender una pantalla principal en menos de 3 segundos.

La jerarquía debe responder siempre:

```text
¿Dónde estoy?
¿Qué está pasando?
¿Qué puedo hacer ahora?
```

## 1.3 Amigable

UGO debe sentirse humano, claro y cercano sin ser infantil.

Tono:

```text
breve
directo
tranquilo
útil
```

Evitar lenguaje técnico o burocrático.

## 1.4 Confianza

Precio, profesional, ubicación, estado y siguiente paso deben estar siempre claros cuando sean relevantes.

Nunca esconder información crítica detrás de decoración.

---

# 2. Arquitectura visual

La estructura principal de UGO será:

```text
MAPA / CONTEXTO
+
BOTTOM SHEET / ACCIÓN
+
BOTTOM NAVIGATION
```

Esto debe ser especialmente fuerte en Home Cliente y Home Proveedor.

## Capas

```text
0  mapa
10 controles mapa
20 bottom sheet
30 bottom navigation
40 snackbar/toast
50 modal
```

No utilizar z-index arbitrarios.

---

# 3. Sistema visual

## 3.1 Paleta

La UI debe ser mayormente neutra.

```css
:root {
  --ugo-bg: #F7F7F7;
  --ugo-surface: #FFFFFF;
  --ugo-text: #111111;
  --ugo-text-secondary: #6B6B6B;
  --ugo-border: #E8E8E8;

  --ugo-brand: #16C7D9;
  --ugo-brand-dark: #0FA8B8;
  --ugo-success: #16A15D;
  --ugo-warning: #D98B00;
  --ugo-danger: #D93025;
}
```

Uso:

```text
Negro → acciones principales y texto fuerte
Blanco → superficies
Gris → estructura y texto secundario
Cyan UGO → identidad, selección, Hugo
Verde → éxito solamente
Rojo → error / destructivo solamente
```

No convertir toda la app en cyan.

## 3.2 Tipografía

Usar una sans-serif limpia y legible.

Escala:

```text
28 px / 700 → título principal
22 px / 700 → título sección
18 px / 600 → título card
16 px / 400–600 → body / CTA
14 px / 400–600 → labels
12 px / 500 → metadatos
```

No usar textos importantes debajo de 12 px.

## 3.3 Espaciado

Base 4 px.

```text
4
8
12
16
20
24
32
```

Margen mobile estándar:

```text
16 px
```

## 3.4 Radios

```text
input/button: 12–14 px
card: 16 px
bottom sheet: 24 px arriba
pill: 999 px
```

## 3.5 Sombras

Muy suaves.

Solo usar en:

- bottom sheet;
- cards flotantes;
- controles encima del mapa.

---

# 4. Tamaño y responsive

Diseño de referencia:

```text
390 × 844 px
```

Validar mínimo:

```text
360 × 800
375 × 812
390 × 844
412 × 915
430 × 932
```

Áreas táctiles:

```text
mínimo 44 × 44
preferido 48 × 48
```

Usar safe areas cuando corresponda.

---

# 5. UGO Cliente — Home / Radar

Esta pantalla define la experiencia del producto.

## Objetivo

El usuario abre UGO y debe entender inmediatamente:

```text
Estoy acá
Puedo pedir un servicio
Tengo que tocar acá
```

## Layout

```text
┌──────────────────────────────┐
│ ubicación       🔔     avatar│
│                              │
│                              │
│             MAPA             │
│                              │
│                         ◎    │
│                              │
├──────────────────────────────┤
│ ¿Qué servicio necesitás?     │
│                              │
│ 🧹      🔧      ⚡      🚿    │
│ Limp.   Rep.    Elec.  Plom. │
│                              │
│ [ Encontrar profesionales ]  │
├──────────────────────────────┤
│ Inicio  Servicios Activ. Perfil│
└──────────────────────────────┘
```

## Top bar

Debe ser compacta.

Mostrar:

- ubicación actual;
- notificaciones;
- avatar.

Evitar header tradicional alto.

## Mapa

Debe ocupar visualmente la mayor parte de la pantalla.

Mostrar solo:

- ubicación actual;
- providers relevantes si existen;
- botón centrar ubicación.

No llenar el mapa de pins.

## Bottom sheet

Debe ser blanco, limpio y simple.

Orden:

```text
buscador
categorías
CTA
```

Texto buscador:

```text
¿Qué servicio necesitás?
```

Categorías iniciales:

```text
Limpieza
Reparación
Electricidad
Plomería
```

CTA:

```text
Encontrar profesionales
```

Botón principal oscuro o cyan sólido según validación visual, pero uno solo debe dominar.

---

# 6. Flujo Cliente

## 6.1 Crear solicitud

No mostrar un formulario largo.

Usar flujo progresivo:

```text
Qué necesitás
→ Dónde
→ Cuándo
→ Presupuesto
→ Confirmar
```

Cada paso debe tener una pregunta principal.

### Descripción

Prompt:

```text
¿Qué necesitás resolver?
```

Helper:

```text
Contanos brevemente qué pasa.
```

### Dirección

Prellenar desde perfil si existe.

### Urgencia

No usar checkbox pequeño.

Usar selector:

```text
Normal
Urgente
```

### Presupuesto

Mostrar moneda claramente:

```text
R$ 120
```

---

# 7. Profesionales disponibles

No convertir la pantalla en un marketplace lleno de tarjetas.

Mostrar cards simples.

Cada card responde:

```text
Quién es
Rating
Cantidad de trabajos
Distancia / ETA
Precio
```

Ejemplo:

```text
[foto] Marcos Silva        ★ 4.9
       Electricista · 184 trabajos
       2,4 km · 8 min

       R$ 135

       [Elegir]
```

Proveedor seleccionado:

- borde cyan fino;
- check claro;
- sin efectos exagerados.

---

# 8. Servicio solicitado / matching

La prioridad no es una timeline compleja.

Mostrar un estado grande y claro.

Ejemplo:

```text
Buscando profesional…

Estamos buscando alguien disponible cerca tuyo.

[ animación simple ]

Cancelar búsqueda
```

Si hay oferta:

```text
Encontramos un profesional
```

No mostrar cinco etapas con texto diminuto simultáneamente.

---

# 9. Profesional en camino

Layout:

```text
MAPA

bottom sheet:
Marcos está en camino
Llega en ~8 min

[foto] Marcos Silva · ★4.9

[Mensaje]   [Llamar]
```

Estado y ETA son prioridad.

---

# 10. Servicio en curso

Mostrar solo lo operativo:

```text
Trabajo en curso
Electricidad
Marcos Silva
Inicio 14:32

R$ 135

[Ver detalle]
```

Si aparece adicional:

```text
Trabajo adicional solicitado
+ R$ 45
+ 30 min

[Rechazar] [Aceptar]
```

---

# 11. Agregar trabajo / Ampliar servicio

Categoría interna:

```text
Mejoras de flujo de trabajo
```

Objetivo:

```text
mantener el adicional dentro de UGO
```

Proveedor propone:

```text
Qué hay que hacer
Costo extra
Tiempo extra
Enviar
```

Cliente recibe:

```text
Trabajo adicional
Cambio de toma eléctrica

+ R$ 45
+ 30 min

Nuevo total: R$ 180

[No, gracias] [Aceptar]
```

Debe ser imposible confundir el precio viejo con el nuevo.

---

# 12. Pago

Pantalla simple.

```text
Servicio terminado

Servicio             R$ 135
Adicional              R$ 45
────────────────────────────
Total                 R$ 180

[ Pagar R$ 180 ]
```

Estados:

```text
Procesando
Pendiente
Confirmado
Fallido
Reembolsado
```

Cada estado debe decir qué pasa después.

---

# 13. Valoración

Muy breve.

```text
¿Cómo estuvo el servicio?

☆ ☆ ☆ ☆ ☆

Puntual
Profesional
Buena comunicación
Trabajo prolijo

Comentario opcional

[Enviar]
```

---

# 14. UGO Proveedor — Home / Oportunidades

Debe sentirse igual de simple que Cliente.

Pregunta principal:

```text
¿Hay trabajo para mí ahora?
```

## Layout

```text
Estado: ● Disponible

MAPA

bottom sheet:
3 oportunidades cerca

Electricidad
1,8 km · R$ 145
[Ver]

Plomería
3,2 km · R$ 110
[Ver]
```

No usar dashboard complejo como home.

---

# 15. Detalle de oportunidad

Debe permitir decidir rápido.

```text
Electricidad
Canasvieiras
2,1 km · ~7 min

Cambiar una toma que no funciona.

Ganás aprox.
R$ 120

[Rechazar] [Aceptar trabajo]
```

La tarifa es una de las piezas visuales más importantes.

---

# 16. Trabajo aceptado

```text
Trabajo aceptado

Electricidad
Marcos / Cliente
2,1 km

Checklist
✓ herramientas
✓ ubicación
✓ detalles del pedido

[Ir al cliente]
```

---

# 17. Hugo — asistente de trabajo

Hugo debe ser útil, discreto y contextual.

No convertirlo en un chatbot que ocupa toda la pantalla.

Usar:

```text
tarjetas de sugerencia
checklists
quick actions
alertas
resúmenes
```

Ejemplo:

```text
Hugo
Para este trabajo llevá:
• tester
• destornillador
• cinta aisladora

[Ver checklist]
```

Durante trabajo:

```text
Hugo sugiere
¿El cliente pidió algo adicional?

[Agregar trabajo]
```

---

# 18. Navegación inferior

Cliente:

```text
Inicio
Servicios
Actividad
Perfil
```

Proveedor:

```text
Inicio
Trabajos
Ganancias
Perfil
```

Reglas:

- máximo 4 tabs en primera versión;
- icono + label;
- tab activa clara;
- navegación fija;
- no usar menús redundantes.

---

# 19. Componentes UI mínimos

No crear un sistema gigante antes de necesitarlo.

Primera tanda:

```text
Button
IconButton
Input
SearchBar
Card
Avatar
Badge
BottomSheet
BottomNav
TopBar
ServiceCategory
ProviderCard
OpportunityCard
StatusBanner
EmptyState
HugoCard
```

Agregar nuevos componentes solo cuando aparezca una necesidad real.

---

# 20. Estados UX obligatorios

Cada flujo debe contemplar:

```text
loading
empty
error
offline
success
disabled
```

Casos específicos:

```text
ubicación denegada
sin proveedores
sin oportunidades
matching sin resultado
servicio cancelado
proveedor desconectado
pago pendiente
pago fallido
servicio en disputa
```

Ejemplo empty state:

```text
No hay profesionales cerca ahora

Podemos seguir buscando o cambiar el horario.

[Intentar de nuevo]
```

---

# 21. Accesibilidad

Requisitos mínimos:

```text
44×44 px mínimo por target
48×48 recomendado
contraste AA
focus visible
aria-label en icon buttons
labels reales en formularios
no depender solo del color
texto mínimo relevante 12 px
reduced motion
```

---

# 22. Arquitectura CSS

Reducir progresivamente estilos inline.

No hacer una migración masiva en un solo commit.

Estructura sugerida:

```text
src/design-system/
  tokens.css
  primitives.css
  patterns.css
```

O CSS Modules si la arquitectura actual demuestra que conviene.

Regla:

```text
si un valor se repite → token
si un patrón se repite → componente
si una pantalla es única → estilo local
```

---

# 23. Fases de implementación

## Fase 1 — Auditoría

- mapa de pantallas;
- mapa de componentes;
- mapa de estados;
- deuda visual;
- dependencias funcionales.

## Fase 2 — Base visual

- tokens;
- Button;
- IconButton;
- Input;
- Card;
- BottomSheet;
- BottomNav.

## Fase 3 — Cliente Home

Rediseñar solamente:

```text
UGO Cliente / Home · Radar
```

Validar visualmente antes de avanzar.

## Fase 4 — Cliente completo

```text
solicitud
providers
matching
tracking
servicio
adicionales
pago
rating
```

## Fase 5 — Proveedor Home

```text
UGO Proveedor / Home · Oportunidades
```

## Fase 6 — Proveedor completo

```text
oportunidad
aceptado
trayecto
servicio
Hugo
adicionales
ganancias
perfil
```

---

# 24. Criterios de aceptación por pantalla

Una pantalla no está terminada hasta cumplir:

```text
[ ] objetivo claro
[ ] CTA principal evidente
[ ] jerarquía correcta
[ ] no hay contenido innecesario
[ ] funciona a 360 px
[ ] funciona a 430 px
[ ] no hay overflow horizontal
[ ] targets táctiles correctos
[ ] loading contemplado
[ ] error contemplado
[ ] vacío contemplado
[ ] no rompe lógica existente
[ ] build pasa
```

---

# 25. Validación técnica

Después de cada bloque:

```bash
npm run build
```

Luego:

```bash
npm run lint
```

Si el repo requiere instalación:

```bash
npm install
```

No avanzar si build queda roto.

---

# 26. Definición de terminado

El rediseño se considera aprobado cuando:

- UGO se entiende sin explicación;
- Cliente puede pedir un servicio con pocos pasos;
- Proveedor puede detectar y aceptar trabajo rápidamente;
- cada pantalla tiene una acción principal clara;
- mapa y sheets se sienten naturales;
- no hay saturación visual;
- el lenguaje visual Cliente/Proveedor es consistente;
- Hugo ayuda sin molestar;
- todos los estados críticos tienen UI;
- el proyecto mantiene su lógica actual;
- el build pasa;
- el resultado se siente como producto comercial, no como panel técnico.

---

# 27. Regla final de diseño

Ante cualquier duda entre agregar y quitar:

```text
quitar
```

Ante cualquier duda entre explicar y simplificar:

```text
simplificar
```

Ante cualquier duda entre mostrar cinco acciones o una:

```text
mostrar la acción que corresponde ahora
```

UGO debe sentirse **rápido, obvio, limpio y confiable**.
