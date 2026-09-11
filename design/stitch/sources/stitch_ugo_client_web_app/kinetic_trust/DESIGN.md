---
name: Kinetic Trust
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d494d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d797e'
  outline-variant: '#bcc9ce'
  surface-tint: '#00677d'
  primary: '#00677d'
  on-primary: '#ffffff'
  primary-container: '#00b4d8'
  on-primary-container: '#00414f'
  inverse-primary: '#4cd6fb'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#19bc84'
  on-tertiary-container: '#00442d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b3ebff'
  primary-fixed-dim: '#4cd6fb'
  on-primary-fixed: '#001f27'
  on-primary-fixed-variant: '#004e5f'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.005em
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
  code-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
  sidebar-expanded: 17.5rem
  sidebar-collapsed: 5rem
  topbar-height: 4.25rem
  gutter-mobile: 1rem
  gutter-desktop: 1.5rem
---

## Brand & Style

The design system embodies a modern, on-demand marketplace identity rooted in safety, immediacy, and operational clarity. It bridges the gap between high-velocity booking utility and the calm assurance required when inviting service providers into personal spaces. 

### Visual Archetype & Mood
The aesthetic combines **Modern High-Trust SaaS** with **Tactile Precision Glass**. It avoids overly playful consumer tropes in favor of an engineered, responsive interface that conveys reliability, safety verification (such as the trust shield), and real-time situational awareness. The interface feels active yet composed: dynamic mapping modules and live state indicators sit within structured, clean slate containers.

### Core Principles
- **Uncompromising Assurance:** Trust vectors—biometrics, background validations, verification badges, and safety toggles—are treated as primary architectural components, not footnotes.
- **Atmospheric Spatial Context:** Crisp translucent headers, floating map controllers, and depth layering establish context without obstructing geographical navigation.
- **Engineered Ergonomics:** High touchpoint density with precise micro-interactions, subtle borders, and intentional feedback loops tailored for immediate decision-making.

## Colors

The palette balances vibrant electric cyan accents against foundational naval slates to communicate technological efficiency alongside structural stability.

### Color Roles & Semantic Application
- **Primary Electric Cyan (`#00B4D8`):** The primary interaction driver. Used for core action triggers, path highlights, active tab indicators, and dynamic telemetry markers.
- **Secondary Deep Navy (`#0F172A`):** The structural anchor. Applied to dark high-contrast headers, the primary collapsible sidebar, primary typography, and security badge housings.
- **Tertiary Fresh Emerald (`#10B981`):** Represents certified status, verified providers, active real-time connections, and positive completion states.
- **Warning & Rating Amber (`#F59E0B`):** Dedicated to user ratings, provider metrics, urgent schedule notices, and cautionary safety alerts.
- **Neutral Slate Stack (`#0F172A` to `#F8FAFC`):**
  - Surface Background: `#F8FAFC` (Slate 50)
  - Surface Container / Cards: `#FFFFFF`
  - Subtle Dividing Strokes: `#E2E8F0` with alpha scaling (`rgba(226, 232, 240, 0.8)`)
  - Subdued Text / Icons: `#64748B` (Slate 500)
  - Muted Borders: `#CBD5E1` (Slate 300)

### Surface Hierarchy
Surfaces follow a clean-to-deep continuum: foundational app viewports use `#F8FAFC`, elevated interactive cards sit on pure `#FFFFFF`, and persistent navigation modules (such as the master navigation bar and command sidebar) leverage deep slate hues (`#0F172A` and `#1E293B`) to establish anchored boundaries.

## Typography

The typography system relies exclusively on **Plus Jakarta Sans** to combine contemporary geometric proportions with high optical legibility across varying display sizes and map overlays.

### Scale Rules & Composition
- **Display & Headings:** Use tight negative letter-spacing (`-0.02em` to `-0.01em`) with medium-to-bold weights to convey impact and immediate structure.
- **Body:** Open counters and balanced x-height guarantee that addresses, service descriptions, and pricing calculations remain effortless to parse at a glance.
- **Labels & Microcopy:** Used extensively in telemetry metrics, verification tags, and tracking chips. Tight tracking is relaxed (`0.02em` to `0.04em`) with bold weights to preserve legibility at small sizes.

## Layout & Spacing

The web application utilizes a **Fluid Functional Shell** layout model, accommodating dynamic map canvas areas alongside persistent productivity rails.

### Shell Architecture
- **Collapsible Sidebar:** A persistent left utility column that transitions between `17.5rem` (expanded, showing full labels and quick actions) and `5rem` (collapsed icon-rail state) to maximize screen area for map-driven flows.
- **Top Bar:** Fixed `4.25rem` height containing contextual location breadcrumbs, active request status pills, and user profile diagnostics.
- **Main Canvas:** Divided into flexible panels. On dashboard views, it uses a 12-column responsive fluid grid. On booking views, it splits into a 60/40 ratio between interactive map elements and step-by-step interactive cards.

### Breakpoints & Adaptive Behavior
- **Desktop (`>= 1280px`):** Persistent two-column or split-panel map views with expanded side navigation. Cards and dialogs dock contextually over map viewports.
- **Tablet (`768px - 1279px`):** Sidebar automatically defaults to collapsed mode (`5rem`). Map canvases stay locked to top or background, with service flows transitioning into sheet-like overlays.
- **Mobile (`< 768px`):** Sidebar transitions to an off-canvas drawer. The top bar condenses to essential breadcrumbs and safety icons. Workflow cards become floating bottom sheets with gesture drag-handles.

## Elevation & Depth

Visual hierarchy is maintained through a combination of crisp container boundaries, subtle backdrop blurs, and soft, tinted ambient drop shadows that simulate real physical layers over continuous mapping planes.

### Layer Hierarchy
- **Canvas Base (Level 0):** Flat background `#F8FAFC` or full-bleed interactive map tile layer.
- **Surface Level 1 (Panels & Sidebar):** `#FFFFFF` or `#0F172A` with a micro-border `1px solid rgba(226, 232, 240, 0.8)`. No shadow; depth is established strictly by tonal boundaries.
- **Floating Overlays & Cards (Level 2):** Booking panels, provider cards, and assistant tooltips.
  - Shadow: `0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)`
  - Border: `1px solid rgba(226, 232, 240, 0.9)`
- **Interactive Modals, Dropdowns & Live Tracking Overlays (Level 3):**
  - Shadow: `0 20px 32px -4px rgba(15, 23, 42, 0.12), 0 8px 16px -2px rgba(15, 23, 42, 0.06)`
  - Border: `1px solid rgba(226, 232, 240, 1)`
- **Frosted Translucency (HUD Elements & Top Bar):** Glassmorphic surface backed with `backdrop-filter: blur(12px)` and `background-color: rgba(255, 255, 255, 0.85)` (or `rgba(15, 23, 42, 0.85)` in dark contexts), paired with an internal highlight border `inset 0 1px 0 0 rgba(255, 255, 255, 0.4)`.

## Shapes

The design system employs a **Rounded** shape system (`roundedness: 2`), utilizing generous 16px (`1rem`) to 24px (`1.5rem`) radii on prominent surfaces to balance technological precision with approachable, consumer-friendly usability.

### Corner Radius Mapping
- **Cards & Primary Modules:** `1rem` (`rounded-2xl`). Delivers smooth edges for floating UI modules over dynamic maps.
- **Buttons, Stepper Nodes & Inputs:** `0.75rem` (`rounded-xl`). Balances finger-friendly target size with structured alignment.
- **Chips, Radar Markers, Status Badges & Avatars:** Fully rounded / circular (`9999px` / `rounded-full`). Maintains distinct recognition for non-modal interactive elements.
- **Dropdown Menus & Micro-Tooltips:** `0.75rem` (`rounded-xl`).

## Components

### Buttons
- **Primary:** Background `#00B4D8`, text `#FFFFFF`, font weight semi-bold (`600`), radius `0.75rem`. Subtle hover state shift to `#0284C7`. Focus state rings with `ring-4 ring-cyan-100`.
- **Secondary / Slate:** Deep navy fill `#0F172A`, text `#FFFFFF`, hover `#1E293B`. Used for high-priority security or confirmation steps.
- **Outlined / Tertiary:** Background transparent, border `1px solid #E2E8F0`, text `#334155`. Hover brings a neutral wash of `#F1F5F9`.
- **Destructive:** Light crimson wash `#FEE2E2`, border `#FECACA`, text `#DC2626`.

### Cards & Panels
- Constructed with `rounded-2xl`, background `#FFFFFF`, and structural stroke `1px solid rgba(226, 232, 240, 0.8)`. 
- Padding follows a default internal rhythm of `1.5rem` (`p-6`), condensing to `1rem` (`p-4`) on compact mobile screen sizes.

### Input Fields & Controls
- **Text Inputs:** Height `2.875rem`, background `#F8FAFC`, border `1px solid #E2E8F0`, border-radius `0.75rem`, text `#0F172A`. Transitions to `#FFFFFF` surface with `#00B4D8` border on focus.
- **Checkboxes & Radios:** Curved profiles (`0.375rem` radius on checkboxes, circular on radios), colored `#00B4D8` when checked, with inset white verification check glyphs.

### Chips & Trust Indicators
- **Trust Shield Badge:** Pill shape (`rounded-full`), soft emerald background tint `rgba(16, 185, 129, 0.1)`, emerald text `#065F46`, stroke `1px solid rgba(16, 185, 129, 0.3)`. Accompanied by a shield verification icon.
- **Status Chips:** Height `1.5rem`, padding `0.25rem 0.75rem`, typography `label-sm`. Active matches Emerald (`#10B981`); In Route matches Cyan (`#00B4D8`); Review Pending matches Amber (`#F59E0B`).

### Interactive Steppers
- Horizontal or vertical connecting pipelines with `2px` stroke in `#E2E8F0`. 
- Completed steps display an emerald check badge; active steps present a pulsing cyan ring anchor; upcoming steps are muted slate nodes.

### Map Radar Markers & Pins
- Circular focal elements with a central deep navy or teal pin containing service category icons, enclosed by a CSS pulse animation simulating live radar scan pings (`rgba(0, 180, 216, 0.25)`).

### Contextual Assistant Module
- Compact floating panel anchored to the bottom right or sidebar. Employs a subtle top highlight gradient (`linear-gradient(to right, #00B4D8, #10B981)`), translucent white surface backdrop, and prompt pills for rapid service queries.