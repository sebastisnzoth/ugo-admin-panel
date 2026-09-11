---
version: alpha
name: UGO Design System v1
description: "Sistema visual compartido de UGO basado en el handoff de Google Stitch: confianza operativa, superficies táctiles y contexto en tiempo real."
colors:
  primary: "#006948"
  primary-container: "#00855D"
  on-primary: "#FFFFFF"
  secondary: "#00687A"
  secondary-container: "#57DFFE"
  tertiary: "#0058BE"
  surface: "#FAF8FF"
  surface-container: "#EAEDFF"
  surface-lowest: "#FFFFFF"
  on-surface: "#131B2E"
  on-surface-variant: "#3D4A42"
  outline: "#6D7A72"
  outline-variant: "#BCCAC0"
  success: "#006948"
  warning: "#B45309"
  error: "#BA1A1A"
  error-container: "#FFDAD6"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Inter Tight, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: "800"
    lineHeight: "44px"
    letterSpacing: "-0.03em"
  headline-lg:
    fontFamily: "Plus Jakarta Sans, Inter Tight, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: "700"
    lineHeight: "38px"
  headline-md:
    fontFamily: "Plus Jakarta Sans, Inter Tight, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: "700"
    lineHeight: "28px"
  headline-sm:
    fontFamily: "Plus Jakarta Sans, Inter Tight, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: "600"
    lineHeight: "24px"
  title-md:
    fontFamily: "Plus Jakarta Sans, Inter Tight, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: "600"
    lineHeight: "22px"
  body-md:
    fontFamily: "Plus Jakarta Sans, Inter Tight, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "20px"
  label-md:
    fontFamily: "Plus Jakarta Sans, Inter Tight, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: "600"
    lineHeight: "16px"
rounded:
  sm: "0.375rem"
  DEFAULT: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  full: "9999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
  touch-target: "48px"
components:
  button: { height: "48px", rounded: "md", backgroundColor: "#006948", textColor: "#FFFFFF" }
  icon-button: { width: "48px", height: "48px", rounded: "full", backgroundColor: "#FFFFFF" }
  input: { height: "48px", rounded: "md", backgroundColor: "#FFFFFF" }
  card: { rounded: "lg", padding: "20px", backgroundColor: "#FFFFFF" }
  badge: { height: "28px", rounded: "full", backgroundColor: "#006948", textColor: "#FFFFFF" }
  bottom-sheet: { rounded: "xl", backgroundColor: "#FFFFFF" }
  bottom-nav: { height: "64px", backgroundColor: "#FFFFFF" }
  provider-card: { rounded: "lg", backgroundColor: "#FFFFFF" }
  status-banner: { rounded: "full", backgroundColor: "#E5F5ED", textColor: "#006948" }
---

# UGO Design System v1

## Overview

UGO es una herramienta de servicios urbanos donde la interfaz debe transmitir control y confianza durante operaciones en tiempo real. El sistema adopta la dirección **Kinetic Trust** documentada por Stitch: superficies frías y luminosas, verde esmeralda para acciones verificadas, cian para Hugo y azul para contexto geográfico.

- **Registro:** producto operativo; la landing puede expresarse con más libertad, pero Cliente, Provider, Admin y Super Admin comparten estos tokens.
- **Firma visual:** tarjetas táctiles flotando sobre contexto de mapa y estados de operación claramente codificados.
- **Anti-referencias:** no usar neón dominante, gradientes decorativos, sombras pesadas ni layouts que parezcan una demo técnica.
- **Propiedad de tokens:** `DESIGN.md` documenta el contrato; `src/mvp/ugo-design-system.css` es el runtime canónico y conserva aliases `--ugo-*` para migración gradual.

## Colors

`primary` (`#006948`) comunica confianza, verificación y acción confirmada. `secondary`/`secondary-container` reservan el cian para Hugo y alertas conversacionales; `tertiary` (`#0058BE`) identifica geografía y utilidades técnicas. Las superficies `surface` → `surface-container` construyen jerarquía tonal sin convertir toda la aplicación en color. `success`, `warning` y `error` son semánticos y nunca deben comunicarse solo por color. El foco visible usa `tertiary` con halo de 3px.

## Typography

La familia canónica es Plus Jakarta Sans, con fallback a Inter Tight, Inter y fuentes del sistema. Display/headline expresan jerarquía; body y label priorizan lectura en móvil, tablas y estados. El texto relevante no baja de 12px. Números, moneda y códigos pueden usar la pila monoespaciada runtime `--ugo-font-mono`.

## Layout

La grilla usa pasos de 4px con ritmo principal de 8px. El margen móvil es 16px y el de tablet 24px. Los targets interactivos miden al menos 48px, incluyendo icon buttons y navegación inferior. El layout es mobile-first: 360–430px, tablet con gutters ampliados y desktop con shell persistente cuando el flujo lo requiere. Se preservan safe-area insets en bottom sheets y bottom navigation.

## Elevation & Depth

La jerarquía se expresa primero con superficies tonales y bordes. `--ugo-shadow-card` se reserva para cards de contenido; `--ugo-shadow-float` para controles sobre mapas; `--ugo-shadow-sheet` para bottom sheets. No se aplican sombras fuertes a texto, tablas planas ni contenedores de navegación.

## Shapes

Inputs y botones usan `md` (12px), cards `lg` (16px), sheets `xl` (24px) y pills/avatars `full`. Los controles circulares deben mantener 48px para accesibilidad. Los bordes usan `outline-variant`; no se mezclan radios arbitrarios en una misma familia de componentes.

## Components

### Foundational visual states

Todos los primitives tienen default, hover, focus-visible, pressed, disabled y busy. Los flujos agregan loading/skeleton, empty, no-results, error, offline y success con copy accionable y recuperación explícita. El skeleton usa un pulso de 1.5s y respeta `prefers-reduced-motion`.

### Buttons and actions

La combinación énfasis × intención es: `primary` para la única CTA principal, `secondary` para escape/no destructivo, `success` para confirmar un resultado y `danger` para acciones irreversibles. Los botones mantienen geometría mientras están busy y nunca usan color como único indicador.

### Navigation and data display

`topbar`, `bottom-nav`, tabs, cards de proveedor/oportunidad, badges de estado y timelines consumen los mismos tokens. El mapa queda como contexto y no desplaza la acción primaria. Las tablas Admin/Super Admin deben mantener scroll propio y estados de carga/vacío/error sin alterar el layout.

### Forms and overlays

`input`, `search`, `bottom-sheet` y estados inline usan labels semánticos, foco visible y mensajes asociados. Las confirmaciones destructivas son diálogos propios de la aplicación; no se usa `alert`, `confirm` ni `prompt` del navegador.

### Iconography

Se priorizan iconos lineales de 20–24px con stroke uniforme y alineación óptica. Los icon-only controls deben tener nombre accesible; cuando no hay glyph Stitch equivalente se usa el sprite existente (`public/icons.svg`) o un fallback textual, nunca un SVG inventado por pantalla.

### Motion

Las transiciones estándar duran 140–220ms; el skeleton dura 1.5s. El movimiento comunica estados de matching, llegada y actualización en tiempo real. Todos los primitives desactivan animación/transición bajo `prefers-reduced-motion: reduce`.

### Content and data visualization

Copy directo y orientado a la acción: “Encontrar profesionales”, “Guardar cambios”, “Reintentar”. Estados financieros conservan formato localizado y semántica explícita. Gráficos y mapas deben ofrecer etiqueta textual o tabla equivalente cuando el dato sea crítico.

## Inconsistencies and migration ledger

- El código histórico usa `Source Sans Pro`, `Inter` e `Inter Tight`; el token canónico ahora es Plus Jakarta Sans con fallbacks. Las hojas legacy pueden migrarse progresivamente sin duplicar tokens.
- Existían verdes (`#087F5B`, `#159A63`) y superficies distintas por módulo; los aliases `--ugo-green`, `--ugo-bg`, `--ugo-surface` apuntan al contrato Stitch para evitar nuevas divergencias.
- `public/icons.svg` contiene principalmente iconos sociales; no existe una biblioteca completa de iconos Stitch. La ampliación de iconografía queda pendiente de un export real, sin inventar assets.
- Penpot contiene referencias de layout, pero no sustituye los tokens declarados por el handoff Stitch.

## Do's and Don'ts

- **Do:** usar variables semánticas y primitives compartidos antes de escribir CSS de pantalla.
- **Do:** conservar la lógica existente de Supabase, Auth, Realtime y pagos; el sistema solo define presentación y estados visuales.
- **Don't:** copiar HTML de Stitch, crear componentes equivalentes locales o introducir una segunda paleta.
- **Don't:** adoptar claims de infraestructura del handoff (escrow, BACEN, AWS, Redis o WebSocket propio) como decisiones de runtime.

## Migration strategy

1. Migrar primero shells compartidos y primitives (`Button`, `IconButton`, `Input`, `Card`, estados y navegación).
2. Aplicar tokens por flujo completo, empezando por Cliente Home/Radar y luego Provider.
3. Llevar Admin/Super Admin a la misma semántica de estados, tablas, filtros y permisos.
4. Retirar aliases y valores legacy solo cuando no existan consumidores; verificar cada etapa con build, contraste, responsive y navegación.
