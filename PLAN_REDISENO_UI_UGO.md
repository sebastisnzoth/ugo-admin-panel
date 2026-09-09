# Plan de rediseño profesional de UGO

## Objetivo

Aplicar una capa visual profesional a UGO **sin rehacer la aplicación y sin alterar la lógica funcional existente**.

El trabajo se hará directamente sobre el repositorio:

`sebastisnzoth/ugo-admin-panel`

La aplicación ya está construida con **React + TypeScript + Vite** y utiliza, entre otras dependencias, Supabase, TomTom/MapLibre y React 19.

La prioridad es transformar la experiencia visual de las apps de **Cliente** y **Proveedor** para que UGO se perciba como un producto móvil moderno, claro y confiable, con una experiencia inspirada en la simplicidad operativa de apps como Uber, pero adaptada a contratación de servicios.

---

# 1. Regla principal de trabajo

Antes de cambiar cualquier pantalla:

- No modificar lógica de negocio salvo que sea imprescindible para conectar una mejora visual.
- No romper flujos existentes.
- No eliminar integraciones con Supabase, mapas, pagos ni servicios existentes.
- No cambiar contratos de datos innecesariamente.
- Separar los cambios visuales de los cambios funcionales.
- Trabajar pantalla por pantalla.
- Validar cada etapa antes de continuar.
- Mantener el proyecto compilando durante todo el rediseño.

El rediseño debe ser una **evolución del producto existente**, no una reconstrucción desde cero.

---

# 2. Flujo de trabajo que seguirá ChatGPT/Codex

## Paso 1 — Auditoría del frontend actual

Revisar:

- `src/mvp/ClientApp.tsx`
- componentes de Cliente existentes
- componentes de Proveedor existentes
- componentes compartidos
- `src/App.css`
- `src/index.css`
- estructura de navegación
- mapas actuales
- estados de servicio
- formularios
- botones
- tarjetas
- modales
- mensajes de error y estados vacíos

Objetivo: entender qué ya existe y **reutilizarlo**.

No empezar cambiando código hasta haber identificado el flujo actual.

---

# 3. Crear una rama exclusiva de diseño

Todos los cambios visuales deben hacerse en una rama específica.

Nombre recomendado:

```text
feat/ugo-ui-professional
```

No trabajar directamente sobre `main` para el rediseño.

Antes de comenzar:

```bash
git checkout main
git pull
git checkout -b feat/ugo-ui-professional
```

---

# 4. Crear el Design System de UGO dentro del propio código

No depender de Figma, Penpot ni herramientas externas para poder avanzar.

El sistema visual debe vivir en el repositorio y ser reutilizable.

Crear una estructura similar a:

```text
src/
  design-system/
    tokens.css
    typography.css
    components/
      UgoButton.tsx
      UgoCard.tsx
      UgoInput.tsx
      UgoIconButton.tsx
      UgoBottomNav.tsx
      UgoBadge.tsx
      UgoAvatar.tsx
      UgoBottomSheet.tsx
```

La estructura exacta puede adaptarse a la arquitectura real después de la auditoría.

---

# 5. Tokens visuales base

Definir variables CSS para que toda la aplicación use la misma identidad.

Ejemplo conceptual:

```css
:root {
  --ugo-cyan: #16C7D9;
  --ugo-green: #20C56A;
  --ugo-ink: #111827;
  --ugo-muted: #667085;
  --ugo-background: #F7F9FC;
  --ugo-surface: #FFFFFF;
  --ugo-border: #E7EAF0;

  --ugo-radius-sm: 10px;
  --ugo-radius-md: 16px;
  --ugo-radius-lg: 24px;

  --ugo-shadow-card: 0 8px 30px rgba(16, 24, 40, 0.08);
}
```

Los valores definitivos se ajustarán visualmente durante la implementación.

---

# 6. Principios de diseño UGO

UGO debe transmitir:

- confianza
- rapidez
- cercanía
- seguridad
- simplicidad
- claridad de precio y estado
- sensación de plataforma profesional

## Dirección visual

- Mobile first.
- Interfaces limpias.
- Fondo claro.
- Cyan como identidad UGO.
- Verde para acciones positivas/confirmación.
- Tipografía moderna y legible.
- Mucho espacio visual.
- Jerarquía clara.
- Tarjetas con radios suaves.
- Sombras discretas.
- Iconografía consistente.
- Botones grandes y evidentes.
- Áreas táctiles mínimas de aproximadamente 44–48 px.

No copiar visualmente a Uber. Tomar solamente referencias de **simplicidad, jerarquía y velocidad del flujo**.

---

# 7. Resolución móvil de referencia

Diseñar primero sobre un viewport de referencia:

```text
390 × 844 px
```

La interfaz debe seguir siendo responsive y adaptarse a otros tamaños.

---

# 8. Rediseño de UGO Cliente

El primer flujo a cerrar será **Cliente**.

## Pantalla 1 — Home / Radar

Prioridad máxima.

Debe incluir:

- mapa como elemento principal
- ubicación actual
- menú
- notificaciones
- avatar/perfil
- presencia visual de Hugo/UGO
- buscador principal:
  - `¿Qué servicio necesitás?`
- categorías rápidas:
  - Limpieza
  - Reparación
  - Electricidad
  - Plomería
- CTA principal:
  - `Encontrar profesionales`
- navegación inferior:
  - Inicio
  - Servicios
  - Actividad
  - Perfil

La pantalla debe permitir entender qué hacer en menos de 3 segundos.

## Pantalla 2 — Selección del servicio

- categoría
- descripción
- dirección
- fecha/hora
- urgencia
- fotos cuando corresponda
- estimación inicial si existe

## Pantalla 3 — Profesionales disponibles

- foto/avatar
- nombre
- categoría
- rating
- cantidad de trabajos
- distancia
- tiempo estimado de llegada
- rango de precio/cotización cuando corresponda

## Pantalla 4 — Proveedor seleccionado

- ficha clara del profesional
- reputación
- trabajos realizados
- precio/cotización
- condiciones
- CTA de confirmación

## Pantalla 5 — Servicio solicitado / búsqueda

- estado visible
- mapa
- animación o feedback de búsqueda
- posibilidad de cancelar según reglas existentes

## Pantalla 6 — Profesional en camino

- mapa
- posición
- ETA
- datos del proveedor
- contacto/chat
- información de seguridad

## Pantalla 7 — Servicio en curso

- estado
- hora de inicio
- datos del trabajo
- contacto
- acciones permitidas

## Pantalla 8 — Agregar trabajo / Ampliar servicio

Permitir que Cliente y Proveedor puedan registrar un trabajo adicional dentro del mismo servicio.

Debe contemplar:

- descripción del adicional
- nueva cotización
- tiempo extra
- aprobación del Cliente
- actualización del total
- trazabilidad

Objetivo: evitar acuerdos fuera de la plataforma y mantener el historial completo del servicio.

## Pantalla 9 — Finalización / Pago

- resumen del servicio
- precio original
- adicionales
- total
- método de pago
- comprobante/estado

## Pantalla 10 — Valoración

- estrellas
- comentario
- etiquetas rápidas
- feedback final

---

# 9. Rediseño de UGO Proveedor

Una vez aprobado el lenguaje visual de Cliente, reutilizar los mismos componentes y tokens.

## Pantalla 1 — Home / Demanda / Oportunidades

Debe mostrar rápidamente:

- estado del proveedor: disponible/no disponible
- mapa
- oportunidades cercanas
- demanda por zona
- distancia
- tipo de servicio
- precio o rango cuando corresponda
- urgencia
- CTA para ver/aceptar oportunidad

## Pantalla 2 — Detalle de oportunidad

- servicio solicitado
- ubicación aproximada según reglas de privacidad
- distancia
- tiempo estimado
- descripción
- fotos
- precio/cotización
- aceptar/rechazar

## Pantalla 3 — Trabajo aceptado

- navegación
- cliente
- dirección permitida
- acciones previas
- checklist

## Pantalla 4 — Servicio activo

- iniciar/finalizar trabajo
- estado
- cronómetro cuando aplique
- información del servicio
- contacto con cliente

## Pantalla 5 — Asistente de Trabajo UGO

Integrar un copiloto contextual para el proveedor.

Debe poder asistir:

### Antes del servicio
- checklist
- herramientas necesarias
- recomendaciones
- información del trabajo

### Durante el servicio
- ayuda técnica contextual
- pasos sugeridos
- recordatorios
- seguridad
- detección de posibles adicionales

### Después del servicio
- checklist de cierre
- fotos/evidencias
- resumen
- recomendaciones de seguimiento

El asistente debe **ayudar a ejecutar**, no ser solamente un chat genérico.

## Pantalla 6 — Agregar trabajo / Ampliar servicio

El proveedor puede proponer un adicional sin salir de UGO:

- descripción
- costo
- tiempo extra
- enviar al cliente
- esperar aprobación
- incorporar automáticamente al servicio si es aprobado

## Pantalla 7 — Ganancias

- ingresos del día
- semana
- mes
- trabajos terminados
- pendientes
- pagos
- comisiones

## Pantalla 8 — Reputación / Perfil

- rating
- trabajos realizados
- especialidades
- documentación/verificación
- estadísticas básicas

---

# 10. Estados que deben diseñarse, no solamente el "estado ideal"

Cada pantalla importante debe contemplar:

- loading
- vacío
- éxito
- error
- sin conexión
- permiso de ubicación denegado
- sin profesionales disponibles
- servicio cancelado
- pago pendiente
- pago rechazado
- proveedor desconectado
- cotización vencida

Una interfaz profesional necesita contratos UX para todos estos estados.

---

# 11. Mapas

El repositorio ya incluye dependencias relacionadas con mapas.

El rediseño debe mantener la integración existente y mejorar solamente su presentación cuando sea posible.

Sobre el mapa pueden existir:

- ubicación del usuario
- proveedores
- oportunidades
- radios de búsqueda
- rutas
- ETA
- bottom sheets
- botones flotantes de ubicación

No reemplazar la integración cartográfica sin una razón técnica comprobada.

---

# 12. Componentes reutilizables prioritarios

Crear/reutilizar componentes en lugar de repetir estilos por pantalla.

Prioridad:

1. Button
2. IconButton
3. Search/Input
4. ServiceCategory
5. ProviderCard
6. OpportunityCard
7. BottomSheet
8. BottomNavigation
9. TopBar
10. Avatar
11. Badge/Status
12. Rating
13. PriceSummary
14. EmptyState
15. LoadingState
16. Modal/ConfirmDialog
17. Map controls
18. Hugo assistant card

---

# 13. Accesibilidad

Como mínimo:

- buen contraste
- fuente legible
- no depender exclusivamente del color
- estados de foco
- botones con tamaño táctil suficiente
- labels para iconos interactivos
- formularios con errores comprensibles
- soporte razonable para tamaños de texto mayores

---

# 14. Qué NO se hará durante la primera etapa

Para no volver a perder tiempo mezclando tareas:

- no migrar framework
- no rehacer backend
- no reemplazar Supabase
- no cambiar pagos
- no reestructurar base de datos
- no cambiar APIs sin necesidad
- no rehacer mapas desde cero
- no incorporar features nuevas que no sean necesarias para el diseño actual

Primero: **hacer que UGO se vea y se sienta profesional**.

Después se continúa con nuevas funcionalidades.

---

# 15. Secuencia real de ejecución

La implementación debe seguir este orden:

```text
1. Auditar código actual
2. Crear rama de UI
3. Crear tokens globales
4. Crear componentes base
5. Rediseñar Cliente / Home Radar
6. Ejecutar build y validar
7. Revisar visualmente
8. Corregir Home hasta aprobarla
9. Extender diseño al resto del flujo Cliente
10. Validar flujo Cliente completo
11. Rediseñar Proveedor / Home Oportunidades
12. Extender diseño al flujo Proveedor
13. Integrar visualmente Asistente de Trabajo
14. Revisar responsive y accesibilidad
15. Build final
16. Abrir Pull Request
```

---

# 16. Regla de aprobación pantalla por pantalla

No rediseñar veinte pantallas de una vez.

Proceso:

```text
Implementar → mostrar → revisar → corregir → aprobar → continuar
```

La primera pantalla que define el lenguaje visual será:

**UGO Cliente / Home · Radar**

Luego ese mismo sistema se propagará a las demás pantallas.

---

# 17. Validación técnica después de cada bloque

Ejecutar:

```bash
npm install
npm run build
```

Y cuando corresponda:

```bash
npm run lint
```

No dar por terminado un bloque si el proyecto no compila.

---

# 18. Git y commits

Usar commits pequeños y descriptivos.

Ejemplos:

```text
feat(ui): add UGO design tokens
feat(ui): add shared mobile components
feat(client-ui): redesign home radar
feat(client-ui): redesign provider selection
feat(provider-ui): redesign opportunities home
feat(provider-ui): add work assistant interface
fix(ui): improve mobile spacing and safe areas
```

---

# 19. Pull Request final

Al finalizar, abrir PR desde:

```text
feat/ugo-ui-professional
```

hacia:

```text
main
```

El PR debe indicar:

- pantallas modificadas
- componentes nuevos
- cambios visuales globales
- comprobación del build
- funcionalidades preservadas
- pendientes visuales, si existen

---

# 20. Definición de terminado

El rediseño se considera terminado cuando:

- Cliente tiene lenguaje visual consistente.
- Proveedor comparte el mismo sistema visual.
- Los flujos existentes siguen funcionando.
- Los mapas siguen funcionando.
- Los componentes se reutilizan.
- La experiencia mobile es clara.
- No hay desbordes importantes en 390 × 844.
- Loading/error/empty states principales están diseñados.
- El proyecto compila sin errores.
- Los cambios están aislados en una rama y PR revisable.

---

# Resultado buscado

UGO debe dejar de sentirse como un MVP técnicamente armado y empezar a sentirse como un **producto comercial listo para mostrar a clientes, proveedores, socios e inversores**.

La prioridad no es agregar más complejidad. La prioridad es que lo que UGO ya hace se presente con una experiencia visual profesional, consistente y confiable.
