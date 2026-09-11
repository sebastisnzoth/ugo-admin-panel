---
name: Urban Kinetic
colors:
  surface: '#f8faf7'
  surface-dim: '#d9dad8'
  surface-bright: '#f8faf7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f2'
  surface-container: '#edeeec'
  surface-container-high: '#e7e9e6'
  surface-container-highest: '#e1e3e1'
  on-surface: '#191c1b'
  on-surface-variant: '#3f4943'
  inverse-surface: '#2e3130'
  inverse-on-surface: '#f0f1ef'
  outline: '#6f7a72'
  outline-variant: '#bec9c1'
  surface-tint: '#076c4b'
  primary: '#004f35'
  on-primary: '#ffffff'
  primary-container: '#006948'
  on-primary-container: '#91e5bc'
  inverse-primary: '#83d7ae'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#9ce8fd'
  on-secondary-container: '#076a7c'
  tertiary: '#004b59'
  on-tertiary: '#ffffff'
  tertiary-container: '#006577'
  on-tertiary-container: '#74e3ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ff4ca'
  primary-fixed-dim: '#83d7ae'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005237'
  secondary-fixed: '#abedff'
  secondary-fixed-dim: '#86d2e6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#abedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#f8faf7'
  on-background: '#191c1b'
  surface-variant: '#e1e3e1'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies a modern, on-demand service ecosystem designed to orchestrate complex home and urban tasks with effortless fluidity. Built on the core values of trust, technological precision, and human warmth, the UI delivers an immediate sense of reliability akin to premier mobility and delivery platforms, elevated by an intelligent assistant layer.

The visual style blends **Modern Digital Utility** with **Tonal Glass Accents**:
- Crisp, clinical structure balanced by organic, welcoming curves.
- Clean surfaces dominated by deep emerald anchors and luminescent cyan intelligences.
- Immediate physical feedback with tactile micro-interactions designed for high-stress, on-the-go scenarios (such as an emergency plumber booking or real-time professional dispatch).
- A mobile-first philosophy prioritizing thumb-zone ergonomic reach, rapid visual scanning, and unmistakable transactional clarity.

## Colors

The palette establishes an immediate foundation of trust, sustainability, and technological intelligence:

- **Primary (`#006948` - Deep Emerald):** Represents stability, vetted craftsmanship, and operational excellence. Used for primary CTAs, active states, key branding elements, and verified seals.
- **Secondary (`#00687A` - Deep Cyan / Teal):** Provides balanced depth across secondary workflows, navigation layers, and category differentiations.
- **Tertiary / Accent (`#57DFFE` - Vibrant Cyan / Hugo AI):** Reserved for predictive capabilities, intelligent suggestions, automated routing, dynamic tracking pulses, and high-priority contextual prompts.
- **Neutral Surface & Canvas:** The background sits on an ultra-soft cool tint (`#F8FBF9`), allowing pure white cards (`#FFFFFF`) to pop naturally with low visual fatigue. Divider lines and subtle borders strictly use `#E2E8F0` or `#E0E3E1` for delicate structural separation.
- **Semantic Accents:** Urgent alerts leverage `#BA1A1A` (Destructive), active transit/progress states use `#D97706` (Amber/Warning), and confirmed service states anchor back to `#006948` (Success).

## Typography

The type hierarchy leverages **Plus Jakarta Sans** uniformly across display, body, and label roles. Its geometric underpinnings provide high-tech clarity, while generous apertures ensure effortless readability on low-luminance mobile screens and varying outdoor conditions.

- **Display & Headlines:** Heavy weights (`700` and `800`) with tight letter spacing convey confidence in active booking statuses, dynamic service discovery, and hero greetings.
- **Body:** Open counters and clean strokes maintain high legibility in service terms, real-time messaging, and breakdown items.
- **Labels & Badges:** Tuned with subtle tracking increases at smaller scales (`label-sm` at `+0.04em`) to ensure instant recognition of status pills, provider ETAs, and certification badges.

## Layout & Spacing

The layout is built around a rigorous 8px base rhythm with 4px sub-intervals for tight alignment, icon paddings, and badge internal spacers:

- **Mobile Viewport Target:** Primary canvas is baseline calibrated at 390×844px, fluidly flexing between 360px and 430px widths without layout breakages.
- **Safe Area Insets:** Layouts account for device hardware bars: top status bars (`44px` minimum top offset) and bottom home indicators (`34px` bottom cushion added to fixed bars).
- **Touch Targets:** All interactive triggers enforce an unconditional minimum touch footprint of 48×48px, even when the visible visual icon or chip is smaller.
- **Grid Architecture:** 4-column fluid mobile grid with 16px margins (`margin-mobile` defaults to `16px`, expanding to `20px` on larger devices) and 12px gutters.

## Elevation & Depth

Visual hierarchy uses a combined model of tonal surfaces and ultra-diffused, ambient drop shadows tinted with deep slate and forest pigments:

- **Level 0 (Flat Canvas):** `#F8FBF9` base canvas. Zero elevation.
- **Level 1 (Cards & Modules):** Pure white `#FFFFFF` paired with an ultra-soft border (`1px solid #E2E8F0`) and an ambient shadow: `0px 2px 8px rgba(0, 40, 28, 0.04)`.
- **Level 2 (Floating Controls & Navigation):** AppHeader and BottomNavigation sit above canvas content with soft blurring backdrops (`backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.88)`) and shadow: `0px 4px 16px rgba(0, 40, 28, 0.08)`.
- **Level 3 (Modals & BottomSheets):** Elevated floating sheets feature heavy surface dampening: `0px -8px 32px rgba(0, 20, 15, 0.12)`, grounding user focus directly on the checkout, scheduling, or Hugo Assistant dialogues.
- **Level 4 (Hugo AI Pulse):** AI modules use a diffuse cyan aura: `0px 0px 20px rgba(87, 223, 254, 0.35)` to signify real-time thinking and automated assistance.

## Shapes

The design system implements a balanced rounded aesthetic (Level 2: `0.5rem` / 8px base radius):

- **Buttons & Text Inputs:** `12px` (`rounded-lg`) corner radii strike the balance between consumer-friendly soft shapes and industrial precision.
- **Category & Provider Cards:** `16px` (`rounded-xl`) outer radius gives modular elements a distinct framing against the `#F8FBF9` background.
- **BottomSheets:** `24px` top-left and top-right radii for smooth, ergonomic drawer pull-ups.
- **Pills, Badges & Avatars:** Fully rounded (`9999px`) for status indicators, counter badges, verified seals, and live tracking tags.

## Components

### Buttons & Interactive Controls
- **PrimaryButton:** Height `52px`, background `#006948`, text white, `12px` radius. Active state scales subtly (`0.98`) with background `#005238`. Full width on mobile checkouts.
- **SecondaryButton:** Height `52px`, outline or surface tint (`#E8F5E9`), border `1.5px solid #006948`, text `#006948`.
- **IconButton:** Minimum `48x48px` tap target with centered `24px` iconography. Background `#FFFFFF` with `1px solid #E2E8F0` or tonal tint.

### Navigation & Headers
- **AppHeader:** Fixed `56px` height + safe area top inset. Transparent or frosted white background with contextual back navigation, location selector pill, and shortcut icon buttons.
- **BottomNavigation:** 4 key destinations (*Inicio*, *Servicios*, *Actividad*, *Perfil*). Height `64px` + bottom safe area inset. Active item displays `#006948` icon with micro-indicator dot below; inactive items display neutral muted `#717D77`.

### Search & Discovery
- **SearchBar:** `48px` pill or `12px` rounded field with search icon prefix, placeholder text `#89938F`, and Hugo AI Copilot trigger chip on the right edge.
- **CategoryCard:** Aspect ratio approx 1:1. Tonal container with subtle `#E2E8F0` border, soft background icon container, and bold category title.
- **ProviderCard:** Horizontal structure with `64x64px` provider avatar, verified badge overlay, star rating badge, distance/ETA indicator, and starting price tag.

### Spatial & Live Operations
- **MapView & ProviderMarker:** Vector map base with muted streets. Live providers represented by custom circular pin with `#006948` border, pulsating `#57DFFE` halo when en route, and category micro-icon.
- **ServiceTimeline:** Vertical stepped tracker. Completed nodes rendered in solid `#006948`, current active node animated with pulsating `#57DFFE` border, and pending nodes in neutral gray line.
- **UGOShield:** Trust badge component with metallic-tinted emerald crest icon, verified background wash (`rgba(0, 105, 72, 0.06)`), and inline guarantee label.

### Hugo Copilot (AI Integration)
- **HugoAssistant:** Floating contextual bubble or docked assistant card. Features `#57DFFE` gradient accents, voice waveform animation trigger, and predictive action chips (e.g., *"Plomero urgente"*, *"Limpieza mañana"*).

### Overlays, Feedback & Status
- **BottomSheet:** Swipeable gesture handle (`4x36px` pill), draggable sheet container with snapping positions (35%, 60%, 90% viewport height).
- **StatusBadge:** Pill-shaped (`rounded-full`), `24px` height, using semantic color combinations: *En Camino* (Amber tint), *Confirmado* (Emerald tint), *En Revisión* (Cyan tint).
- **States (Empty, Loading, Error, Success):** Centered layout with contextual vector illustrations, concise headline, supportive helper text, and a sticky bottom recovery CTA button.