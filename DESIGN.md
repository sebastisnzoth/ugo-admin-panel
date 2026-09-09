---
version: alpha
colors:
  ink: "#172421"
  inkSoft: "#52665c"
  muted: "#64706b"
  canvas: "#f3f5f3"
  surface: "#ffffff"
  line: "#dbe5de"
  brand: "#087f5b"
  brandStrong: "#056348"
  brandSoft: "#e3f3e9"
  warning: "#a85f00"
  danger: "#b3261e"
  focus: "#165dff"
typography:
  display:
    fontFamily: '"Inter Tight", Inter, ui-sans-serif, system-ui, sans-serif'
  body:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
  utility:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  Button:
    minHeight: "44px"
  Card:
    radius: "16px"
  BottomNavigation:
    height: "60px"
---

## Overview

UGO is a trust-first service marketplace. The product UI should feel like an **operational radar**: calm, precise, local and action-oriented rather than decorative. The provider sees demand and the next safe action; the client sees service progress and confidence; operations sees exceptions and decisions.

The signature element is the **UGO Radar status language**: live availability, nearby demand and service progress are expressed with compact status signals and restrained map/radar cues. This is the one expressive motif. Everything else stays quiet, legible and task-first.

The product register is utilitarian with a distinct identity, not a marketing dashboard. Avoid crypto/neon aesthetics, glassmorphism, gratuitous gradients, over-rounded cards, emoji-as-primary-navigation, and generic “AI SaaS” visual patterns.

## Colors

- `brand` / `brandStrong` express UGO identity and safe primary actions.
- `brandSoft` is reserved for selected states, positive context and low-emphasis status surfaces.
- `ink` carries primary text and high-trust surfaces.
- `canvas`, `surface` and `line` establish a low-noise hierarchy.
- Warning and danger are semantic, never decorative. Never communicate state by color alone.
- `focus` is intentionally distinct from the brand green so keyboard focus remains unmistakable.

Provider Radar currently owns the canonical application palette above. Future Cliente and Admin migrations should map to these semantic roles rather than copying raw hex values into screen-local CSS.

## Typography

Use Inter Tight sparingly for high-information headings and compact operational identity. Use Inter/system sans for body, labels, controls and data. Headings should gain hierarchy through weight, scale and spacing, not ornamental type treatment.

Use sentence case for product copy. Short uppercase utility labels are allowed only for true status/eyebrow metadata such as `RADAR UGO`, `DISPONIBLE` and `PROTEGIDO`.

## Layout

UGO is mobile-first for Cliente and Proveedor. The current provider reference shell is centered at a maximum width of 390px on larger screens and respects device safe areas. Bottom navigation remains reachable with one thumb; primary controls target at least 44px height.

Assign one scroll owner per layout mode. On Provider Radar the content sheet owns vertical scrolling while the map/header/navigation remain stable. Do not add page-level `overflow:hidden` to unrelated routes merely to reproduce this layout.

Spacing is compact but not dense: 8–16px inside control groups, 16–24px between information groups. Reserve geometry during async states so primary actions do not move.

## Elevation & Depth

Elevation communicates interaction or temporary layering. Static information cards are predominantly bordered/flat with only a restrained shadow. Floating map controls, bottom sheets and temporary overlays may use stronger elevation.

Do not stack multiple shadow styles inside one decision area. Avoid glow effects.

## Shapes

Use 12–18px radii for cards and primary controls. Pills are reserved for statuses, availability toggles and truly compact metadata. Do not make every container a pill.

The Hugo control may use a circular shape because it is a persistent assistant affordance; that shape is not a general button pattern.

## Components

**Buttons** — one safe primary action per decision area. Pair semantic intent with emphasis. Every enabled button requires hover, focus-visible and active states; every async button requires a stable busy state. Danger actions remain visually separated from safe actions.

**Status / Notice** — shared semantic tones: success, info, warning, error. Text is always present. Status feedback uses an accessible live region and must never be the only location of corrective form information.

**Opportunity Card** — shows category, client/context, price and explicit accept/reject actions. “Best match” may receive the radar accent but must not visually overpower the decision controls.

**Service Progress** — shows lifecycle state, payment protection and next allowed action. Payment state is high-risk product information and must be explicit in text.

**Bottom Navigation** — labels remain visible. The active destination exposes `aria-current`. Hugo is a real button, not a decorative element.

**Map controls** — remain secondary to the workflow. A map failure must not make core service data inaccessible.

## Do's and Don'ts

**Do** keep the same operation label across screens, make service/payment state explicit, preserve safe areas, show recovery paths, use semantic HTML, maintain WCAG 2.2 AA focus/contrast targets, and respect reduced-motion preferences.

**Don't** expose raw backend errors, use browser `alert/confirm/prompt`, make clickable `div`s, hide scrollbars, move controls while loading, encode meaning only with color, or invent a screen-local version of an existing shared behavior.
