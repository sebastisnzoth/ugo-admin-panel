---
name: Modern Dynamic Marketplace
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
  on-surface-variant: '#444653'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#4c2e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b4200'
  on-tertiary-container: '#ffa929'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
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
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
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
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  screen-margin-mobile: 1rem
  screen-margin-tablet: 1.5rem
  card-padding: 1.25rem
  bottom-nav-height: 4.5rem
  header-height-mobile: 3.75rem
---

## Brand & Style
The brand personality centers on rapid reliability, peer trust, and financial mobility within dynamic Latin American economies. The visual style marries **Modern Clean Utility** with **Tactile Fluidity**—grounded in bank-grade security (CPF validation, instant PIX escrow, insured contracts) while remaining energetic, friendly, and street-smart for everyday service providers and busy urban consumers.

The visual direction emphasizes crisp, structural surfaces, fluid mobile-first ergonomics, micro-interactions that confirm transactional finality, and friendly rounded containers. It strips away ornamental clutter in favor of high visual contrast, immediate data legibility under bright sunlight, and reassuring tactile feedback that elevates user confidence in hiring, negotiating, and transacting.

## Colors
The palette leverages a deep electric cobalt indigo as the anchor for institutional stability and operational trust, paired with a vibrant tech teal that signals agility and real-time execution. An energetic amber/gold accent serves as the high-visibility focal point for instant action triggers, PIX transfers, dynamic ratings, and escrow locks.

### Functional Roles
- **Primary (`#1E40AF`)**: High-priority interaction targets, authenticated security seals, navigation states, primary buttons, and verified provider insignias.
- **Secondary (`#0D9488`)**: Real-time geolocation indicators, successful PIX transaction markers, availability badges, and micro-stat counters.
- **Tertiary (`#F59E0B`)**: Escrow alerts, action buttons, rating stars, urgent job match highlights, and promotional tags.
- **Neutral (`#0F172A`)**: Base typographic color, deep dark containers, and contrast strokes.

### System & State Colors
- **Success (`#059669`)**: Approved background checks, active payouts, confirmed tasks.
- **Warning / Pending (`#D97706`)**: CPF identity check in progress, document re-upload pending.
- **Error / Danger (`#DC2626`)**: Transaction aborted, unverified identity, dispute escalation.
- **Surface Background (`#F8FAFC`)**: Soft cool canvas balancing dense card grids on mobile OLED and LCD displays.
- **Surface Card (`#FFFFFF`)**: Pure white layered elevated cards.

## Typography
The system utilizes **Plus Jakarta Sans** for expressive, humanistic headlines and foundational UI body copy, paired with **Inter** for dense transactional labels, monetary figures (BRL/R$), CPF formatting, and micro-data points.

- Titles and headings maintain tight tracking to generate a clean, modern poster-like impact.
- Numbers, timestamps, and payment breakdown figures use tabular figures (`font-variant-numeric: tabular-nums`) through the `Inter` family to guarantee precision across vertical transactional ledgers.
- Mobile screens switch from `display-lg` to `display-lg-mobile` to maintain comfortable multi-line flow without wrapping into narrow orphan words.

## Layout & Spacing
The layout model employs a mobile-centric **fluid grid** structured around an 8-point base rhythm with 4-point micro-adjustments for fine control:

- **Mobile (<640px)**: 4-column layout with 16px screen margins (`screen-margin-mobile`) and 12px gutters. Vertical spacing relies heavily on modular stack components that preserve natural thumb-reach ergonomics (bottom 60% of viewport prioritized for high-frequency actions).
- **Tablet / Large Mobile (640px - 1024px)**: 8-column layout with 24px margins, allowing split panes for real-time map tracking and service quoting side-by-side.
- **Safe Area Anchors**: Top and bottom edges systematically pad against OS home indicators and dynamic camera notches. Bottom-anchored transaction bars float with a 16px gap from viewport limits to maintain fluid accessibility.

## Elevation & Depth
Elevation is articulated using **ambient tinted shadows** layered with ultra-fine **low-contrast borders** to safeguard definition against bright outdoor light:

- **Surface Level 0 (Canvas)**: `#F8FAFC`, zero elevation, completely non-reflective.
- **Surface Level 1 (Resting Cards & Listings)**: `#FFFFFF` paired with an ambient shadow: `0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)` and a crisp hairline boundary `border: 1px solid rgba(226, 232, 240, 0.8)`.
- **Surface Level 2 (Interactive Floating Headers, Bottom Bar, and Contextual Sheets)**: `#FFFFFF` with glassmorphic backdrop-blur (`backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.92)`) plus `0 12px 32px -4px rgba(15, 23, 42, 0.12)`.
- **Surface Level 3 (Modals, PIX Payment Verification Sheets)**: Ambient overlay with a deep tint: `0 24px 48px -8px rgba(15, 23, 42, 0.22)`.

## Shapes
The design system embraces an intentional rounded architecture (`roundedness: 2`), applying `1rem` (`rounded-2xl` equivalent in mobile conventions) to primary service and provider cards. This geometry softens high-density technical information, producing an inviting and consumer-accessible look:

- **Primary Cards & Containers**: `1rem` (16px) for standard cards; outer modal sheets scale to `1.5rem` (24px) along top edges.
- **Interactive Buttons & Input Fields**: `0.75rem` (12px) to balance modern softness with structural tap confidence.
- **Badges, Pills, and Tags**: Full circular pill (`9999px`) to immediately isolate status states from standard rectangular content.

## Components

### Buttons & CTAs
- **Primary Action (Tactile Filled)**: Height 52px (optimized for thumb reach). Background `#1E40AF` with high-contrast `#FFFFFF` text. Micro-shadow `0 4px 14px rgba(30, 64, 175, 0.35)`. Active/pressed state physically translates down 1px with reduced shadow to create immediate physical response.
- **PIX Quick-Pay CTA**: Background `#0D9488` with `#FFFFFF` text, paired with an integrated mini lightning/PIX glyph on the left.
- **Secondary / Outline**: Background transparent, 1.5px border `#E2E8F0`, text `#0F172A`, active state transitions to `#F1F5F9`.

### Status Badges & Verification Seals
- Height 24px, pill-shaped (`9999px`), inline padding 10px, typography `label-sm`.
- **Verified CPF / Identity**: Background `rgba(13, 148, 136, 0.12)`, text `#0F766E`, leading checkmark shield icon.
- **PIX Instant / Escrow Secured**: Background `rgba(245, 158, 11, 0.12)`, text `#B45309`, leading lock badge.
- **Pending Verification**: Background `rgba(217, 119, 6, 0.12)`, text `#B45309`.
- **Active Job / Tracking**: Background `rgba(30, 64, 175, 0.1)`, text `#1E40AF`, pulsating 6px dot.

### Service & Provider Cards
- Background `#FFFFFF`, border-radius 16px, padding 16px.
- Features a structured 3-tier hierarchy:
  1. Header: Provider avatar with integrated verified seal, name, star rating (`#F59E0B`), and completed jobs counter.
  2. Body: Service scope, distance/neighborhood indicator, and clear pricing structure ("A partir de R$ XX").
  3. Footer: Direct CTA button ("Solicitar") alongside immediate PIX acceptance badge.

### Input Fields & Masked Inputs
- Height 52px, border-radius 12px, border 1.5px `#E2E8F0`, background `#FFFFFF`.
- Focus state: Border color `#1E40AF`, ring `0 0 0 3px rgba(30, 64, 175, 0.15)`.
- Dedicated input masks for regional parameters: CPF (`000.000.000-00`), Brazilian Phone (`(00) 00000-0000`), and currency prefixes (`R$ 0,00`).

### Sleek Mobile Header
- Height 60px with edge padding 16px. Semi-transparent backdrop blur (`rgba(255,255,255,0.85)`).
- Left: Dynamic neighborhood selector with geo-marker pin.
- Right: Quick-access notification bell with unread amber dot, adjacent to small profile avatar.

### Floating Bottom Navigation
- Elevated pill or dock format resting 12px above bottom safe area, height 64px, radius 20px, background `rgba(255, 255, 255, 0.94)`, border `1px solid rgba(226, 232, 240, 0.8)`.
- 4 primary destinations: Explorar (Search/Discover), Pedidos (Active Bookings), Mensagens (Chat/Negotiation), and Perfil (Account/CPF Status).
- Active item states highlight in `#1E40AF` with a subtle 4px indicator dot beneath the icon.