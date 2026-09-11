---
name: UGO Urban Services
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#076c4b'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#91e5bc'
  inverse-primary: '#83d7ae'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#076a7c'
  tertiary: '#0058be'
  on-tertiary: '#ffffff'
  tertiary-container: '#0057bc'
  on-tertiary-container: '#c2d3ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005237'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#86d2e6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fc'
  warning-rating: '#b45309'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
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
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
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
  space-xxs: 4px
  space-xs: 8px
  space-sm: 12px
  space-md: 16px
  space-lg: 20px
  space-xl: 24px
  space-2xl: 32px
  space-3xl: 40px
  touch-target: 48px
  edge-margin-mobile: 16px
  edge-margin-tablet: 24px
  safe-bottom-android: 24px
---

## Brand & Style

UGO embodies a modern, highly reliable, and warm on-demand service ecosystem. Designed for hyper-local Latin American and coastal metropolitan markets, the brand balances dependable technical efficiency with approachable humanity.

The aesthetic fuses **Corporate/Modern mobile design** with gentle **Glassmorphism** and soft tactile floating surfaces. Translucent cards float above cartographic interfaces, while dynamic pulsing radar elements signal live real-time activity. The visual mood is crisp, transparent, friendly, and reassuring—ensuring users feel in control when booking immediate home services.

## Colors

The palette is anchored by deep emerald green (`#006948`), symbolizing trust, verification, and safety. 
- **Primary (`#006948`):** Action items, verified badges, active navigation icons, and key CTA highlights.
- **Secondary (`#00687a`) & Cyan (`#57dffe`):** Dedicated to conversational AI features (Hugo Asistente) and immediate alert hints.
- **Tertiary (`#0058be`):** Accents map geography, coastal/water geometries, and specialized technical utility categories.
- **Neutral Surface Hierarchy:** Surfaces lean subtly cool-tinted (`#faf8ff` to `#eaedff`), elevating content off clean pure white (`#ffffff`) floating sheets without harsh contrast.
- **Semantic Accents:** Amber (`#b45309`) for star ratings; red (`#ba1a1a`) for live status badges.

## Typography

The typography is rendered exclusively in **Plus Jakarta Sans**, utilizing its geometric clarity, wide aperture, and friendly contemporary curves. 

- **Titles & Display:** Heavy geometric weights (700, 800) with slight negative tracking create impact and tight hierarchy for headings and section labels.
- **Labels & Micro-copy:** Uppercase or high-contrast small weights (11px–12px) paired with positive tracking (`0.02em` - `0.04em`) ensure instant readability across provider badges, breadcrumbs, and bottom sheets.
- **Body & Subtitles:** Regular weights (400) maintain legible contrast against tinted backgrounds.

## Layout & Spacing

Layout structures conform to an **adaptive fluid grid** with strict touch boundary rules:
- **Base Grid:** Built on an 8pt system, using 4px half-steps for micro-alignments (`space-xxs: 4px`, `space-xs: 8px`).
- **Touch Ergonomics:** All interactive buttons, icon hits, and navigation tabs adhere to an explicit minimum target of `48px` (`touch-target`).
- **Safe Area Insets:** Handled consistently across viewports via `pt-safe` and `pb-safe` variables, safeguarding dynamic island cutouts and home bar notches.
- **Breakpoints & Max Dimensions:** Mobile-first layout designed for widths of 360px–430px, centering at max-width constraints on tablet views with horizontal gutter padding expanding from `16px` to `24px`.

## Elevation & Depth

Visual depth is achieved through layered structural elevations paired with soft ambient diffusion:
1. **Canvas Layer (Base, Level 0):** Cartographic vector map and foundational surface tint (`#faf8ff`).
2. **Backdrop Blurs (Level 1):** Top status bar (`backdrop-blur-xl`, 85% opacity) and floating navigation bar (`backdrop-blur-xl`, 95% opacity) preserve background visibility while maintaining contrast.
3. **Floating Micro-Cards & Pills (Level 2):** Provider map badges and location pill controls use `shadow-md` with `bg-surface-container-lowest/95` and slight backdrop blur.
4. **Bottom Sheet & Overlays (Level 3):** Modal search container employs `shadow-2xl` with a negative top offset (`-mt-6`) to nest gracefully above background views.

## Shapes

The design uses a rounded and soft-pill shape language (`roundedness: 2`):
- **Full Pills (`rounded-full`):** Floating action buttons, avatar badges, map radar anchors, and the active location indicator.
- **Large Cards & Bottom Sheet (`rounded-2xl` & `rounded-t-3xl`):** Service icon tiles, AI suggestions, search input field, and main bottom sheet container (24px to 32px corner radius).
- **Avatars & Icons:** Rounded circular formats (`rounded-full`) for people; rounded squares (`rounded-xl`) for category icon backdrops.

## Components

### Buttons
- **Primary Hero Button:** Full-width, `h-[52px]`, `rounded-2xl`, background `#006948`, text `#ffffff`, `font-label-lg`, with active micro-scale feedback (`active:scale-[0.98]`).
- **Icon Buttons:** Circular (`rounded-full`), `48px` touch target, subtle shadow (`shadow-md`), white background with smooth hover/active transitions.

### Search Bar
- Enclosed rounded container (`rounded-2xl`, `bg-surface-container-low`) hosting an inline search glyph, text input, and dedicated microphone action button. Seamlessly shifts to `#ffffff` on focus.

### Service Category Tiles
- 4-column compact grid. Each item features an 11×11 unit tinted tile (`rounded-xl`) holding an outline icon, followed by primary title (`label-md`) and subtitle label (`label-sm`).

### Map Marker Cards
- Pill-shaped cards (`rounded-full`, 95% opacity white), integrating a round provider thumbnail, live status dot, provider name, star rating badge, arrival estimation, and category indicator.

### Floating AI Assistant Banner
- Frosted container (`rounded-2xl`) with secondary-themed icon, live animated pulse indicator, and contextual text preview.

### Bottom Navigation Bar
- Fixed frosted surface (`h-16`, `backdrop-blur-xl`) with evenly distributed 48px touch targets, featuring distinct active states colored in Primary (`#006948`).