---
name: Mission Control Operations
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
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#bb0112'
  on-tertiary: '#ffffff'
  tertiary-container: '#e02928'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
  brand-green-hover: '#047857'
  brand-green-subtle: '#ECFDF5'
  brand-green-border: '#A7F3D0'
  copilot-cyan: '#06B6D4'
  copilot-cyan-hover: '#0891B2'
  copilot-cyan-subtle: '#ECFEFF'
  copilot-cyan-border: '#A5F3FC'
  risk-red-hover: '#B91C1C'
  risk-red-subtle: '#FEF2F2'
  risk-red-border: '#FECACA'
  warning-amber: '#D97706'
  warning-amber-hover: '#B45309'
  warning-amber-subtle: '#FFFBEB'
  warning-amber-border: '#FDE68A'
  surface-canvas: '#F8FAFC'
  surface-panel: '#FFFFFF'
  surface-muted: '#F1F5F9'
  border-subtle: '#E2E8F0'
  border-strong: '#CBD5E1'
  text-primary: '#0F172A'
  text-secondary: '#475569'
  text-muted: '#64748B'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
  data-metric:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  sidebar-width: 260px
  sidebar-collapsed-width: 72px
  topbar-height: 56px
  table-row-height: 44px
  table-header-height: 36px
---

## Brand & Style

This design system establishes a high-density, professional operational command center built for real-time decision-making, incident management, and marketplace orchestration. Synthesizing the precision of Linear, the financial rigor of Stripe Dashboard, and the live operational agility of Uber Operations and Mercado Libre, this interface prioritizes instant situational awareness over passive data visualization.

Every layout, metric, and table row must answer four central questions within three seconds of visual inspection:
1. What is happening right now?
2. What is degraded or failing?
3. What requires urgent human intervention?
4. What is the immediate, non-destructive or auditable action to take?

### Aesthetic Movement
The aesthetic is **High-Density Pragmatic Modernism**. It rejects decorative gradients, bloated cards, and hollow SaaS padding in favor of razor-sharp hairline borders (`1px`), clean optical framing, monospaced tabular figures, and tightly scoped semantic color accents. The interface feels tactile, authoritative, and deeply reliable—an institutional instrument designed for operators handling live logistics, multi-party financial flows, supplier document vetting, and dispute arbitrations.

## Colors

The color palette enforces ruthless semantic discipline. In an operational control room, color is not decoration—it is an unambiguous signal of status, risk, intelligence, or primary action.

- **Primary (`#059669` / `#10B981`)**: Dedicated to confirmed healthy states, verified identities, authorized payments, and positive primary actions. Used with restraint to avoid turning the interface into a sea of green.
- **Secondary / Copilot Cyan (`#0284C7` / `#06B6D4`)**: Reserved specifically for automated platform intelligence, algorithmic scout suggestions, and the persistent administrative copilot. Cyan instantly flags AI-assisted insights or contextual system recommendations.
- **Tertiary / Risk Red (`#DC2626` / `#EF4444`)**: Restricted strictly to operational emergencies, active disputes, unresolvable payment fallouts, high-fraud flags, and destructive deletion actions. Never used for passive warnings.
- **Warning Amber (`#D97706` / `#F59E0B`)**: Signals threshold risks, low-supply alerts, impending SLAs, and pending manual approvals that require attention before escalating into operational blocks.
- **Neutrals & Surfaces**: A layered architecture running from `surface-canvas` (`#F8FAFC`) through crisp white elevated containers (`#FFFFFF`) framed by hairline division lines (`#E2E8F0`). Deep slate (`#0F172A`) ensures maximum contrast and zero visual fatigue across long monitoring shifts.

## Typography

Typography prioritizes information density, legibility under stress, and tabular precision.

- **Primary Workhorse (`Inter`)**: Chosen for its neutral, highly engineered optical balance. In body copy, table grids, and operational badges, standard font weight handles descriptive context, while medium (`500`) and semi-bold (`600`) denote interactive entities and active states.
- **Tabular Numerals**: All numerical figures, currency entries (`BRL / R$`), timestamps, geo-coordinates, and delta indicators must render with `font-feature-settings: "tnum" 1, "cv05" 1`. This prevents column jitter during real-time streaming updates.
- **Data & Identity Monospace (`JetBrains Mono`)**: Applied to immutable transaction IDs (`#UGO-1842`, `MP-TX-99412`), CPF/tax documentation identifiers, API webhook paths, and audit log delta keys. Monospace visually isolates technical verification points from conversational or human-readable content.

## Layout & Spacing

The layout employs a high-density, viewport-anchored structural frame designed specifically for continuous 1440×1024 monitoring environments while responding gracefully down to notebook and tablet viewports.

### Architectural Framing
1. **Persistent Global Rail / Sidebar (`260px` default, `72px` notebook collapsed)**: Houses primary domain modules separated into two clear visual groupings: Day-to-day Realtime Operations (Dashboard, Live Ops, Services, Users, Verifications, Finances, Disputes, Scout) and Controlled Governance (Reports, Categories, Zones, Admins, Audit, System Logs, Settings).
2. **Persistent Global Header (`56px`)**: Remains docked across all views. Hosts global omni-search (cross-matching service IDs, CPFs, Mercado Pago hashes, provider names), active zone dropdown switcher, system health status, persistent Copilot toggle, and session role chip.
3. **Workspace Canvas (`calc(100vh - 56px)`)**: A strictly bounded container running a fluid 12-column sub-grid with `16px` gutters and `20px` perimeter padding.

### Responsive Rules
- **Desktop (>1280px)**: Sidebar locked open, dense multi-pane split views enabled for document verification and dispute resolution.
- **Notebook (1024px - 1279px)**: Sidebar shrinks to icon rail (`72px`), secondary action flyouts transform into right-side sliding overlay drawers (`480px` width).
- **Tablet (<1023px)**: Sidebar collapses into a slide-over off-canvas drawer; tables enforce horizontal scroll containers with frozen ID/Action columns. Never strip operational table columns on smaller displays.

## Elevation & Depth

This design system avoids heavy, atmospheric dropshadows. Depth is articulated through **micro-tonal surface layering** combined with razor-thin structural borders (`1px` solid `#E2E8F0`).

### Elevation Tiers
- **Tier 0 (Backdrop Canvas)**: Ground zero (`#F8FAFC`). No borders, no shadows. Tables and dashboards sit directly on this low-strain backdrop.
- **Tier 1 (Surface Containers & Cards)**: Pure white `#FFFFFF` surface bordered by a crisp `1px` stroke of `#E2E8F0`. Layered with an ultra-subtle grounding shadow: `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Tier 2 (Sticky Headers, Floating Bars, Popovers)**: Pure white `#FFFFFF` with `#CBD5E1` border and a focused elevation shadow: `box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.08)`. Used for dropdown filter menus, date range pickers, and table row hovering tooltips.
- **Tier 3 (Modal Dialogs, Copilot Drawer, Document Loupe)**: Elevated interactive surfaces: `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`. Accompanied by a semi-opaque backdrop scrim (`rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(2px)`).

## Shapes

Shapes are engineered to balance clinical enterprise efficiency with modern software polish. We employ Level 2 (Rounded) geometries:

- **Metric Cards & Content Panels**: Fixed at `12px` or `14px` corner radii. This softens dense multi-widget operational dashboards without wasting perimeter surface area.
- **Interactive Controls (Inputs, Buttons, Segmented Controls)**: Fixed at `8px` (`0.5rem`). This provides crisp tap/click targets that sit neatly within compact `32px` and `36px` control heights.
- **Status Badges & Chips**: Evaluated with pill styling (`9999px`) or compact rounded micro-rectangles (`4px`). Critical risk badges use `4px` corner radius to retain sharp visual urgency, while lifecycle status badges (e.g., *In Progress*, *Searching*) use pill contours.

## Components

### Buttons
- **Primary Operational Button**: Emerald green background (`#059669`), white text, `8px` radius, height `36px` (compact `30px` in table rows). Subtle active scale `0.98`. Focus outline: `2px` offset `#10B981`.
- **Destructive / Dispute Resolution Button**: Red background (`#DC2626`), white text. Used only for unrecoverable actions (e.g., "Suspend Provider", "Authorize Full Refund").
- **Secondary / Ghost Button**: White background, `1px` border `#CBD5E1`, text `#0F172A`. On hover, background shifts to `#F1F5F9`.
- **Copilot Action Button**: Cyan background (`#06B6D4`), white text. Accompanied by a spark or pulse icon.

### Status Badges & Chips
- Compact, low-height (`22px`), uppercase `label-sm` typography with tabular padding (`6px 8px`).
- **Active / Completed**: `#ECFDF5` background, `#047857` text, `1px` border `#A7F3D0`.
- **Investigating / Critical Risk**: `#FEF2F2` background, `#B91C1C` text, `1px` border `#FECACA`.
- **Warning / Action Needed**: `#FFFBEB` background, `#B45309` text, `1px` border `#FDE68A`.
- **Neutral / Draft**: `#F1F5F9` background, `#475569` text, `1px` border `#CBD5E1`.

### Dense Operational Data Tables
- **Metrics**: Header height `36px`, cell height `44px`. Border bottom `1px` solid `#E2E8F0`.
- **Features**: Sticky header on scroll, checkbox selection column, hover row background `#F8FAFC`, right-aligned monospaced numerical data columns (`data-mono`).
- **Inline Row Actions**: Pinned to the right cell; always visible or revealed smoothly on hover without layout shift.

### Metric Cards & Actionable Alert Cards ("Needs Your Attention")
- Built with a top progress or priority indicator bar (`3px` accent line).
- Contains primary indicator (`data-metric`), context label, trending micro-badge (`+12% vs yesterday`), and an explicit action trigger (e.g., "Review 12 Pending Verifications →").
- Never present an alert card without a contextual inline button or direct routing link.

### Document Verification Split-View
- Left Pane (`45%`): Structured identity fields, cross-checked CPF verification data, criminal background status, provider category selections.
- Right Pane (`55%`): High-resolution document viewer with pan/zoom loupe, side-by-side comparison between selfie photo and official photo ID, and an inline decision rejection/approval audit bar.

### Persistent Administrative Copilot
- Docked cyan trigger (`40px` floating trigger or topbar integrated). Opens a `420px` right-hand slide-over drawer (`surface-panel`).
- Offers pre-computed tactical queries ("Where are provider bottlenecks?", "Show delayed services >30m"), provides direct system deep-links, and requires dual-key administrative confirmation before running batch operational commands.