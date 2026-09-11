---
name: Executive Command & Operational Grid
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
  on-surface-variant: '#3d4947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
  tertiary: '#545c72'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c748b'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.875rem
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
    letterSpacing: 0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  metric-mono:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0em
  metric-mono-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system defines an enterprise-grade operational interface engineered for high-velocity platform management, dual-sided marketplace oversight, and executive governance. The visual language blends the razor-sharp informational density of tools like Linear and Retool with the financial precision and structural calm of Stripe.

The personality balances administrative authority, technical rigor, and immediate legibility:
- **Operational Clarity:** Data takes precedence over visual noise. Interfaces provide rapid spatial recognition across dense views without sensory fatigue.
- **Controlled Velocity:** Workflows, moderation queues, and dispute arbitration favor keyboard-first interaction models, clear transactional hierarchies, and explicit state verification.
- **Architectural Hierarchy:** Regular tenant/admin functionality retains a focused, utility-driven emerald/teal palette, while Super Admin governance tools inject deliberate, high-authority purple accents to signal platform-altering, un-scoped permissions.

The aesthetic follows a modern **Corporate / Modern High-Density** paradigm: structural dividers, hairline borders, crisp translucent overlays, tabular typographic alignments, and purposeful semantic indicators.

## Colors

The system uses a calibrated palette capable of rendering thousands of concurrent data cells, operational timelines, and telemetry metrics while preserving critical hierarchy.

### Canvas & Surface Structure
- **Base Canvas (`bg-canvas`):** `#F8FAFC` (Slate 50) establishes a cool, glare-free working area.
- **Elevated Surfaces (`surface-card`, `surface-panel`):** Pure `#FFFFFF` with hairline borders for standard content; `#0F172A` / `#1E293B` for dark mode or dedicated telemetry docks and sidebars.
- **Dividers & Structural Borders (`border-subtle`, `border-muted`):** `#E2E8F0` (Slate 200) for interior table cells; `#CBD5E1` (Slate 300) for modular boundary definitions.

### Brand & Role Accents
- **Primary Operational Teal (`#0D9488`):** Applied to primary actions, interactive selection states, active queue filters, and general platform operations.
- **Super Admin Governance Purple (`#7C3AED`):** Reserved strictly for platform-wide root operations, role impersonation banners, override switches, and ledger-level audit configurations.

### Functional Status Tokens
- **Success / Verified (`#10B981`):** Active listings, verified identity, processed payouts. Background tint: `#ECFDF5`. Border: `#A7F3D0`.
- **Warning / Pending (`#F59E0B`):** Under review, threshold limits approaching, paused accounts. Background tint: `#FFFBEB`. Border: `#FDE68A`.
- **Critical / Danger / Dispute (`#E11D48`):** Active dispute, chargebacks, policy violations, termination. Background tint: `#FFF1F2`. Border: `#FECDD3`.
- **Informational / In-Transit (`#0284C7`):** Logistics dispatch, timeline updates, diagnostic info. Background tint: `#F0F9FF`. Border: `#BAE6FD`.

## Typography

Typography enforces absolute legibility at condensed sizes.

- **Headlines (`Plus Jakarta Sans`):** Provides sharp geometric structure to views, section dividers, and modal headers without consuming excessive vertical space.
- **Body & Data Grid (`Inter`):** Handles general UI hierarchy, form values, and descriptive metadata with high micro-legibility.
- **Tabular Figures (`tnum` / `metric-mono`):** Applied systematically to all financial amounts, user IDs, timestamp logs, queue capacities, and performance metrics via CSS `font-feature-settings: "tnum" 1, "cv05" 1`. This prevents layout shifts across dynamic polling tables and simplifies vertical scanning.

## Layout & Spacing

The layout is built around a full-viewport, 12-column adaptive fluid workbench designed for 1440px+ enterprise displays while gracefully consolidating down to single-column inspect drawers on mobile viewports.

### Architectural Canvas Model
- **Primary Shell:** Fixed left-hand navigation sidebar (collapsible from 260px to 64px), persistent utility header bar (52px height), and a flexible main workspace container.
- **Dual-Pane Workspaces:** Split viewports (e.g., dispute resolution, verification queues) allocate a 55% master list / 45% contextual inspector split or a locked 50/50 comparison pane.
- **Density Grid:** Spacing tokens run on a consistent 4px step scale. Micro-gaps (`space-xs` = 4px, `space-sm` = 8px) drive dense table cells and toolbar clusters. Layout gutters (`16px`) and section margins (`24px`) isolate major data panels to prevent visual crowding.

### Breakpoint Matrix
- **Desktop Expanded (1440px+):** Full multi-pane orchestration, side-by-side verification inspection, expanded table columns with persistent meta sidebars.
- **Desktop Compact (1024px – 1439px):** Inspector transforms into an overlay slide-out sheet drawer; complex tables collapse secondary audit columns.
- **Tablet / Mobile (<1023px):** Operations center adapts to full-width stacked views, with bottom sheets substituting slide-out inspection drawers.

## Elevation & Depth

Visual hierarchy is maintained primarily through hairline boundaries and tinted tonal strata, supplemented by minimal ambient diffusion rather than deep drop shadows.

- **Level 0 (Flat Ground):** Background canvas (`#F8FAFC`). No shadow, structural `#E2E8F0` border.
- **Level 1 (Cards & Data Panels):** `#FFFFFF` surface resting on `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.06)`.
- **Level 2 (Hover & Floating Elements):** Dropdown menus, popovers, and elevated toolbars use `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06)`.
- **Level 3 (Slide-out Drawers & Modals):** Command palettes, detail inspectors, and dispute overlays use `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.08)`. Modals dim background context with a translucent `#0F172A` scrim at 40% opacity (`backdrop-blur-sm`).

## Shapes

The design uses a clean, compact corner radius scale:

- **6px (`rounded-md`):** Buttons, segmented controls, badge tags, form text fields, and dropdown option items.
- **8px to 10px (`rounded-lg`):** Data tables, composite cards, notification alerts, and timeline node cards.
- **12px (`rounded-xl`):** Dialog modals, slide-out drawer sheet viewports, and floating diagnostic command docks.
- **Full Pill (`rounded-full`):** Reserved exclusively for live system status dots, avatar cutouts, and interactive toggle switches.

## Components

### High-Density Data Tables
- **Header:** Sticky top bar, height 36px, background `#F1F5F9`, border-bottom 1px solid `#CBD5E1`. Labels are `label-sm` in `#64748B`, uppercase with `letter-spacing: 0.05em`.
- **Rows:** Height 40px (compact mode) or 48px (standard mode). Alternate rows retain `#FFFFFF` backgrounds with border-bottom 1px solid `#F1F5F9`. Hover state triggers `#F8FAFC`.
- **Selection State:** Row selects apply `#F0FDFA` background with a left inset 3px solid `#0D9488` indicator.
- **Columns:** Cell text inherits `body-sm`. Numeric/financial columns are strictly right-aligned with tabular font features enabled.

### Status Badges & Pills
- **Geometry:** Height 22px, padding `2px 8px`, corner radius `6px`, typography `label-sm`.
- **Tokens:**
  - `VERIFIED` / `RESOLVED`: `#ECFDF5` background, `#047857` text, `#A7F3D0` border.
  - `PENDING_REVIEW`: `#FFFBEB` background, `#B45309` text, `#FDE68A` border.
  - `IN_PROGRESS`: `#F0F9FF` background, `#0369A1` text, `#BAE6FD` border.
  - `DISPUTE` / `SUSPENDED`: `#FFF1F2` background, `#BE123C` text, `#FECDD3` border.
  - `GOVERNANCE_OVERRIDE`: `#F5F3FF` background, `#6D28D9` text, `#DDD6FE` border.
- **Live Indicator:** Includes an optional 6px circular dot on the leading edge (pulsing on urgent states).

### Input Fields & Controls
- **Height & Bounds:** Height 36px, padding `0 10px`, border 1px solid `#CBD5E1`, corner radius `6px`.
- **States:** Focus rings use `0 0 0 2px rgba(13, 148, 136, 0.2)` with a `#0D9488` border. Error states swap to `#E11D48` ring and border.

### Buttons & Action Bars
- **Primary Operational:** Teal fill `#0D9488`, hover `#0F766E`, text `#FFFFFF`, height 36px, padding `0 14px`.
- **Super Admin Root:** Purple fill `#7C3AED`, hover `#6D28D9`, text `#FFFFFF`.
- **Ghost/Outline:** Background transparent, border 1px solid `#CBD5E1`, text `#334155`, hover background `#F1F5F9`.

### Scout Action Cards & Lifecycle Timelines
- **Scout Action Cards:** Elevated Level 1 surface, with a 3px vertical status stripe on the left edge. Action buttons are aligned along the bottom edge with a 1px border separator.
- **Timeline Trackers:** Vertical connection lines (2px width, `#E2E8F0`). Node circles (24px diameter) contain a state icon or stage index. Completed stages display `#10B981`, current stages display `#0D9488` with an active glow ring, and pending stages use `#CBD5E1`.

### Dual-Pane Dispute Mediation View
- **Left Pane (Evidence & Claim):** User reports, uploaded media, chat logs with alternating conversation bubbles (`#F1F5F9` client, `#CCFBF1` provider).
- **Right Pane (Adjudication Console):** Ledger adjustment inputs, policy rule checklist, refund slider with instant breakdown calculations, and primary action bar for binding resolutions.

### Super Admin Audit Log Tables
- **Format:** High-density monospaced event rows showing timestamp (`UTC`), actor role tag (highlighting Super Admin in purple), IP/geo trace, target resource ID, and a collapsible JSON diff viewer displaying `before` (muted red tint) and `after` (muted green tint) key-value changes.