---
name: eBuhay Civic Care Console
# Current role/truth boundary: Authority is ordered: tasks/prd-hospital-integrated-donation-platform.md > .scratch/official-egov-integrations/spec.md for branded integrations > .scratch/synthetic-hospital-demo/spec.md for healthcare workflows. Official eGov staging SSO is the only runtime Citizen login in every environment (authentication invitations superseded; case/pair workflow invitations remain; provider doubles are tests only). Preserve this visual system; eBuhay Simulated Hospital is a synthetic-only hospital contract double, not a production integration.
description: A humane, hopeful, disciplined visual system for an eBuhay web demo/prototype.
colors:
  primary: "#1452f0"
  primary-hover: "#0f3fc0"
  primary-active: "#0c329c"
  primary-subtle: "#e4f0fb"
  destructive: "#CE1126"
  destructive-hover: "#A30D1E"
  sun: "#F59E0B"
  sun-hover: "#D97706"
  emerald: "#059669"
  emerald-hover: "#047857"
  accent-recipient: "#4f9ae1"
  accent-donor: "#047857"
  background: "#FFFFFF"
  background-alt: "#F8FAFC"
  background-tertiary: "#EDF5FC"
  border: "#D7E3EF"
  border-strong: "#9FB7CE"
  foreground: "#112B4D"
  foreground-deep: "#102744"
  foreground-muted: "#52657D"
  foreground-subtle: "#36516E"
  foreground-inverse: "#FFFFFF"
  navy: "#102744"
typography:
  display:
    fontFamily: "Figtree, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6.5vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Figtree, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Figtree, Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Noto Sans, Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.07em"
  mono:
    fontFamily: "JetBrains Mono, Fira Code, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  2xl: "30px"
  full: "9999px"
spacing:
  1: "2px"
  2: "4px"
  3: "8px"
  4: "12px"
  5: "16px"
  6: "20px"
  7: "24px"
  8: "32px"
  9: "40px"
  10: "48px"
  12: "64px"
  16: "80px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.foreground-inverse}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.foreground-inverse}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-danger:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.foreground-inverse}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "9px 13px"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "{spacing.7}"
---

# Design System: eBuhay Civic Care Console

## Overview

**Creative North Star: "The Civic Care Console"**

The eBuhay visual system is humane, hopeful, civic; approachable but disciplined. It supports an eBuhay web demo/prototype that makes a donation and transplant workflow understandable without implying official endorsement, production integrations, or verified real-world records.

Authority is ordered: canonical PRD (`tasks/prd-hospital-integrated-donation-platform.md`) > official eGov staging integration specification (`.scratch/official-egov-integrations/spec.md`) for branded integrations > synthetic hospital demo specification (`.scratch/synthetic-hospital-demo/spec.md`) for healthcare workflows. Citizen runtime login uses official eGov staging SSO only in every environment; authentication invitations are superseded (case and pair workflow invitations remain); provider doubles are tests only. eBuhay Simulated Hospital is synthetic-only, and tickets 25–27 end at **Synthetic Demo Ready**, not production. The interface must not use real healthcare data, connect to live hospital integrations, make clinical decisions, or claim production readiness. Official staging identity never grants Staff authority.

The incumbent interface uses a light-only canvas, strong Philippine-blue primary actions, clear status colors, generous rounded surfaces, and restrained ambient depth. It should feel reassuring and tactile while remaining operationally legible: a caring public service console, not a flashy startup and not sterile hospital software or dense admin tables.

**Key Characteristics:**
- Humane, hopeful civic tone with disciplined hierarchy.
- Light surfaces, high-contrast text, and a blue-led semantic palette.
- Tactile, reassuring controls with layered ambient depth.
- Responsive, role-aware workflow presentation.

## Colors

The palette pairs eBuhay Blue with calm neutral surfaces and semantic colors that communicate action, danger, waiting, and recovery without decoration.

### Primary
- **eBuhay Blue** (`#1452f0`): Primary actions, links, active tabs, focus borders, and civic identity.
- **eBuhay Blue Hover** (`#0f3fc0`): Hover state for primary actions and links.
- **eBuhay Blue Active** (`#0c329c`): Pressed or high-emphasis active state.
- **eBuhay Blue Subtle** (`#e4f0fb`): Soft indicator dot and badge backgrounds.

### Secondary & Roles
- **Lifeline Red** (`#CE1126`): Destructive actions and blood-related status.
- **Hope Gold** (`#F59E0B`): Warning and waiting status.
- **Recovery Green / Donor Accent** (`#047857` / `#059669`): Success, verified status, and donor pathway accent.
- **Recipient Accent** (`#4f9ae1`): Recipient pathway focus and accent border.

### Neutral
- **White** (`#FFFFFF`): App canvas, cards, and input backgrounds.
- **Cloud** (`#F8FAFC`): Alternate surface, muted controls, and hover background.
- **Civic Glow** (`#EDF5FC`): Tertiary surface, glow underlays, and soft tinted areas.
- **Border** (`#D7E3EF`): Default strokes and dividers.
- **Strong Border** (`#9FB7CE`): Interactive strokes and timeline connectors.
- **Ink** (`#112B4D`): Primary text, headings, and card titles.
- **Deep Ink** (`#102744`): High-emphasis footer text and navy surfaces.
- **Slate** (`#52657D`): Supporting text, ledes, captions, and descriptions.
- **Subtle Slate** (`#36516E`): Kickers, timeline descriptions, and trust copy.

### Named Rules
**The Civic Signal Rule.** Use color to communicate responsibility or state first; keep decorative color rare.

**The Prototype Truth Rule.** Visual polish must not imply official endorsement, production integrations, or verified real-world activity.

## Typography

**Display Font:** Figtree (with Inter, system-ui, sans-serif fallback)
**Body Font:** Noto Sans (with Inter, system-ui, sans-serif fallback)
**Label/Mono Font:** Noto Sans for labels; JetBrains Mono (with Fira Code, ui-monospace, monospace fallback) for identifiers and measurements.

**Character:** Figtree gives headings a friendly, confident civic voice with tight tracking; Noto Sans keeps body copy readable and practical. The scale moves from a responsive 72px display through 28px headlines, 18px titles, 16px body text, and compact uppercase labels.

### Hierarchy
- **Display** (800, `clamp(2.75rem, 6.5vw, 4.5rem)`, 1.08): Hero statements and the strongest page introduction.
- **Headline** (800, 28px, 1.1): Section and dashboard headings.
- **Title** (800, 18px, 1.2): Card, modal, and content titles.
- **Body** (400, 16px, 1.6): Explanatory and operational copy, generally kept to a comfortable 65–75ch measure.
- **Label** (700, 11px, 1.3, `0.07em`, uppercase where used): Section markers, field labels, and compact status context.

### Named Rules
**The Clear Responsibility Rule.** Use weight and size to make the user's next responsibility obvious before adding decoration.

## Layout

The web shell centers content in a `1200px` container. Desktop gutters are `24px`; they reduce to `16px` at `<=768px` and `12px` at `<=480px`. The spacing rhythm is `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px`; use the smaller steps inside controls and the larger steps between workflow sections.

Observed breakpoints are `768px` for container and page compression, `720px` for navbar/tab wrapping and role-grid collapse, `640px` for touch-safe controls, input sizing and mobile stacking, `480px` for hero and gutter tightening, and `380px` for the smallest stepper labels. Tabs remain horizontally scrollable on small screens, while forms and action groups stack to preserve readable touch targets.

This is a light-only theme (`color-scheme: light`). Reduced motion disables marquee, live-dot, and entrance animations; high-contrast and visible focus treatments remain available through the existing focus rules.

## Elevation & Depth

Depth is layered and ambient, restrained shadows separate working surfaces. White cards sit above Cloud and Slate Mist surfaces with soft, wide shadows; hover adds a little lift without turning the interface into a stack of floating tiles. Borders remain quiet and structural, while focus rings are a blue semantic state.

### Shadow Vocabulary
- **Ambient low** (`0 1px 2px rgba(15, 23, 42, 0.04)`): Small controls and quiet resting separation.
- **Ambient standard** (`0 2px 8px rgba(15, 23, 42, 0.05)`): Role controls and compact raised elements.
- **Working surface** (`0 12px 34px rgba(15, 23, 42, 0.07)`): Default cards.
- **Working surface hover** (`0 18px 42px rgba(15, 23, 42, 0.10)`): Interactive card hover.
- **Protected surface** (`0 28px 60px rgba(15, 23, 42, 0.13)`): Feature previews and modals.

### Named Rules
**The Ambient Layer Rule.** Shadows separate working surfaces; they do not become decorative outlines or hard-offset effects.

## Shapes

The form language is gently rounded and tactile: `4px` for tiny details, `8px` compact controls, `12px` standard controls, `16px` large controls and small cards, `22px` primary cards, `30px` feature surfaces, and `9999px` pills and status badges. Borders are usually `1px` in Border, with Strong Border reserved for emphasis. Inputs and buttons use the same 12px family so interaction feels coherent; pills are reserved for tabs, badges, and compact statuses.

## Components

Components are tactile and reassuring: each state is legible, focusable, and grounded in the same blue-led system.

### Buttons
- **Shape:** Standard 12px radius, 10px 20px padding; compact buttons use 6px 12px and large buttons use 13px 26px.
- **Primary:** eBuhay Blue with white text and a restrained blue shadow; hover moves to Hover Blue, active presses down 1px, disabled reduces opacity.
- **Secondary / Ghost:** White outline buttons use a 1.5px border; ghost buttons stay transparent until a Cloud hover surface.
- **Semantic:** Recovery Green communicates success; Lifeline Red is reserved for destructive actions.

### Cards / Containers
- **Corner Style:** 22px for working cards, 16px or 12px for compact variants.
- **Background:** White cards on White, Cloud, or Slate Mist surfaces; Navy is a deliberate feature-card exception.
- **Shadow Strategy:** Use the working-surface shadow at rest and ambient hover shadow for interactive cards.
- **Border / Padding:** 1px Border with 24px default internal padding, shrinking to 20px on small screens.

### Inputs / Fields
- **Style:** Full-width white fields, 1px Border, 12px radius, 9px 13px padding, Noto Sans at 14px (16px on small screens to prevent iOS zoom).
- **Focus:** Primary border plus a 3px translucent blue ring; placeholders use Faint Slate.
- **Error / Disabled:** Semantic red error treatment and reduced-opacity disabled controls retain the same shape.

### Navigation and Tabs
- **Navigation:** Sticky white navbar with a 2px primary/red/gold top stripe, subtle border, and 60px inner height; it wraps and hides secondary labels at 720px.
- **Tabs:** Pill tabs use 9px 16px padding, 9999px radius, muted inactive text, Cloud hover, and a filled eBuhay Blue active state with a restrained shadow. At 720px they scroll horizontally; at 640px inactive labels may collapse to icons.

### Badges
- **Style:** Uppercase 11px labels in 9999px pills, 3px 10px padding, semantic tinted backgrounds, and quiet 1px borders. Use Recovery Green for verified/success, Hope Gold for warning, Lifeline Red for danger/blood, and blue for primary/organ states.

### Modal
- **Structure:** A blurred dark overlay contains a white, 540px maximum-width surface with 22px radius, protected-surface shadow, bordered header/footer, and scrollable body.
- **Behavior:** Header and footer use 20px/24px padding; the overlay protects focus for genuinely interruptive confirmation or review tasks.

### Stepper and Upload
- **Stepper:** Five-stage workflows use 28px numbered circles over a 2px divider; active is blue with a blue ring, completed is Recovery Green, and labels are compact but readable on phones.
- **Upload:** File drop zones use a dashed Border, Cloud background, 12px–16px radius, clear status copy, and a Recovery Green confirmation state; never imply a file was verified merely because it uploaded.

## Do's and Don'ts

### Do:
- **Do** keep the north star as **The Civic Care Console**: humane, hopeful, civic; approachable but disciplined.
- **Do** use eBuhay Blue for primary actions and semantic red, gold, and green only for their responsibilities.
- **Do** preserve light surfaces, 1200px content, the observed spacing/radius scales, and visible keyboard focus.
- **Do** keep cards, controls, tabs, modals, steppers, and uploads tactile and reassuring.
- **Do** label the interface as an eBuhay web demo/prototype when context could be mistaken for official or production activity.

### Don't:
- **Don't** use flashy startup/decorative-tech aesthetics, ornamental gradients, or color without a civic purpose.
- **Don't** use sterile hospital software/dense admin tables as the visual model.
- **Don't** turn inline one-offs, a single page composition, or seeded demo data into design-system invariants.
- **Don't** imply official endorsement, real data or identities, production integrations, clinical decisions, legal certainty, immutable records, verified real-world status, or production readiness.
- **Don't** trade accessibility basics for polish: preserve contrast, reduced motion, high contrast, touch-safe sizing, and focus states.
