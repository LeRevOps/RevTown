---
# Note: OKLCH values are used throughout — Stitch's hex-only linter will warn but not error.
# OKLCH is the canonical format for this project; do not split to hex without reason.
name: RevTown
description: The open-source RevOps agent hub
colors:
  warm-terracotta:   "oklch(57% 0.14 35)"
  terracotta-deep:   "oklch(49% 0.13 35)"
  terracotta-pale:   "oklch(96% 0.025 45)"
  commit-green:      "oklch(52% 0.11 148)"
  revenue-ink:       "oklch(17% 0.012 50)"
  muted-field:       "oklch(46% 0.01 50)"
  subtle-rule:       "oklch(70% 0.008 50)"
  parchment-border:  "oklch(90% 0.008 50)"
  warm-white:        "oklch(98.5% 0.007 52)"
  card-surface:      "oklch(99.5% 0.004 52)"
  filing-room:       "oklch(10% 0.004 52)"
  deep-filing-room:  "oklch(7% 0.003 52)"
  light-on-dark:     "oklch(93% 0.01 52)"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(52px, 7vw, 88px)"
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: "-1px"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 600
    lineHeight: 1.1
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(22px, 3vw, 32px)"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.02em"
rounded:
  sm: "4px"
  md: "8px"
  pill: "100px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "18px"
  lg: "32px"
  xl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.warm-terracotta}"
    textColor: "{colors.light-on-dark}"
    rounded: "{rounded.md}"
    padding: "8px 18px"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-deep}"
    textColor: "{colors.light-on-dark}"
    rounded: "{rounded.md}"
    padding: "8px 18px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.warm-terracotta}"
    rounded: "{rounded.md}"
    padding: "8px 18px"
  filter-pill:
    backgroundColor: "{colors.card-surface}"
    textColor: "{colors.muted-field}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  filter-pill-active:
    backgroundColor: "{colors.terracotta-pale}"
    textColor: "{colors.warm-terracotta}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  agent-card:
    backgroundColor: "{colors.card-surface}"
    textColor: "{colors.revenue-ink}"
    rounded: "{rounded.md}"
    padding: "16px 18px"
---

# Design System: RevTown

## 1. Overview

**Creative North Star: "The Ops Room"**

RevTown's visual system is built around a single premise: the catalog is the product. There is no pitch, no funnel, no hero section explaining why CRM hygiene matters. You browse agents, pull one, run it — the same interaction model as Docker Hub. Every surface decision follows that logic: identify what's decorative, remove it, document what remains.

The typeface split defines the experience. Cormorant Garamond carries section headers and the homepage headline — it lends weight and authority to the framing. The moment you enter the Agent Hub, JetBrains Mono takes over: agent names, filter pills, status badges, check counts, CRM chips. The terminal shift is intentional. This is a place where work happens, and the typography signals it.

Colors are restrained. Warm Terracotta is the only accent — it appears on CTAs, active filter states, agent names in the logic panel, and nothing else. Every background is tinted warm (hue 52, chroma 0.004–0.008), never pure white. The two dark sections (CTA and footer) are Filing Room and Deep Filing Room — warm near-blacks that carry the same hue, so the palette reads as one continuous temperature rather than a light/dark switch.

This system explicitly rejects LLM-default aesthetics: gradient blobs, hero metrics with big numbers, glassmorphism, "10x your pipeline" copy set in anything decorative. If it looks like a Figma mock that was never refined, something has gone wrong. If someone can guess the palette from the product category, something has gone wrong.

**Key Characteristics:**
- Catalog-first density: the Agent Hub is the product, not a feature page
- Terminal shift: JetBrains Mono dominates the catalog; Cormorant belongs to headings only
- Warm throughout: every surface tinted toward hue 52, from card white to near-black footer
- Flat by default: no ambient shadows — only a border shift and minimal elevation on hover
- One accent, used sparingly: Warm Terracotta on ≤10% of any given screen

## 2. Colors: The Warm Terracotta Palette

A restrained palette built on one accent and a single warm neutral family. Chroma is low throughout — just enough to feel warm, never enough to feel branded for branding's sake.

### Primary
- **Warm Terracotta** (`oklch(57% 0.14 35)`): The single accent. Used on primary buttons, active filter states, agent names in the logic expand, hover links, and the `Rev` wordmark. Appears on ≤10% of any screen. Its rarity is the point.
- **Terracotta Deep** (`oklch(49% 0.13 35)`): Hover and pressed state for Warm Terracotta elements only. Never used at rest.
- **Terracotta Pale** (`oklch(96% 0.025 45)`): Background tint for active filter pills, hero pill badge, outline button hover. The lightest expression of the accent.

### Secondary
- **Commit Green** (`oklch(52% 0.11 148)`): Status-only. Live and beta agent badges exclusively. Never used for decoration or emphasis. Its presence signals "this runs."

### Neutral
- **Revenue Ink** (`oklch(17% 0.012 50)`): Primary text. Page headings, agent names, nav wordmark. The darkest surface in the light theme.
- **Muted Field** (`oklch(46% 0.01 50)`): Body text, descriptions, secondary nav links, card descriptions.
- **Subtle Rule** (`oklch(70% 0.008 50)`): De-emphasized metadata — namespace, check counts, CRM chip text, hub stats.
- **Parchment Border** (`oklch(90% 0.008 50)`): All borders at rest. Cards, filter pills, CRM chips, card footer dividers.
- **Warm White** (`oklch(98.5% 0.007 52)`): Page background on the homepage.
- **Card Surface** (`oklch(99.5% 0.004 52)`): Card backgrounds, filter pill default background. Barely distinguishable from Warm White — the tint matters for OKLCH coherence, not visual drama.
- **Filing Room** (`oklch(10% 0.004 52)`): Dark section backgrounds (CTA, contribute section). Near-black, barely tinted warm. The terracotta accent does all the work within it — the background just disappears.
- **Deep Filing Room** (`oklch(7% 0.003 52)`): Footer background. Near-pure black with a whisper of warmth. Same approach as Docker Hub, LangChain, and Cursor — the dark is neutral, the accent is the voice.
- **Light on Dark** (`oklch(93% 0.01 52)`): Text and button labels rendered on Filing Room or Deep Filing Room surfaces.

### Named Rules
**The Terracotta Rule.** Warm Terracotta is the only accent color. It appears on ≤10% of any screen. Do not introduce a second accent. Secondary emphasis is achieved through weight, size, or mono font shift — not color.

**The No-Pure-White Rule.** Every neutral must be tinted toward hue 52, chroma ≥ 0.004. `oklch(100% 0 0)` is prohibited. If a surface looks grey, it is the wrong color.

**The Hue-Lock Rule.** All surfaces share hue 50–52 — light and dark. The dark sections are the same hue family as the warm white, just taken to near-black. The terracotta accent (hue 35) is the only departure from this family, and it appears on both light and dark surfaces as the sole voice of color.

## 3. Typography

**Display Font:** Cormorant Garamond, 600 weight (Georgia, serif fallback)
**Body Font:** Inter, 300–600 weight (system-ui, sans-serif fallback)
**Label / Mono Font:** JetBrains Mono, 400–500 weight (Menlo, monospace fallback)

**Character:** Cormorant Garamond carries the authority of a filed report cover page. Inter handles density cleanly. JetBrains Mono signals technical precision — it is the dominant font in the catalog, not a supporting role.

### Hierarchy
- **Display** (600, `clamp(52px, 7vw, 88px)`, lh 1.0, tracking −1px): Homepage headline only. "Welcome to Revtown." Never used in the catalog.
- **Headline** (600, `clamp(32px, 4vw, 48px)`, lh 1.1): Section titles in dark CTA blocks. Cormorant only.
- **Title** (600, `clamp(22px, 3vw, 32px)`, lh 1.1): Page title in the Agent Hub header and section subheadings.
- **Body** (400, 15px, lh 1.6): All descriptive text. Inter. Max line length 65ch on prose; agent card descriptions are clamped to 2 lines.
- **Label** (500, 10.5–12px, tracking 0.02em): JetBrains Mono. Agent names, filter pills, status badges, check counts, CRM chips, hub stats, nav meta. All technical identifiers.

### Named Rules
**The Terminal Shift Rule.** The moment a user enters the Agent Hub, Cormorant yields to JetBrains Mono. Agent names, filter labels, status pills, and all catalog metadata render in mono. Cormorant does not appear in the catalog grid.

**The Scale Ratio Rule.** A minimum 1.3× ratio between adjacent hierarchy steps. Flat type scales — where Display and Headline look interchangeable — are prohibited.

## 4. Elevation

This system is flat by default. Surfaces are differentiated by tonal layering — Warm White page against Card Surface cards, card footer in a slightly deeper tint — rather than ambient shadow.

The only shadow in the system is a state-change response on card hover: `0 2px 12px oklch(17% 0.012 50 / 0.07)`. It appears simultaneously with a border color shift from Parchment Border to a slightly darker warm grey. This is feedback, not decoration.

Dark sections (Filing Room, Deep Filing Room) achieve depth through color, not shadow. No `box-shadow` appears on dark-background elements.

### Shadow Vocabulary
- **Card hover lift** (`0 2px 12px oklch(17% 0.012 50 / 0.07)`): Applied on `.agent-card:hover` only, paired with border-color darkening to `oklch(79% 0.01 50)`. The shadow is diffuse and minimal — a whisper, not a lift.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. The single hover shadow is a state signal, not an aesthetic. Ambient shadows on cards, panels, or nav elements are prohibited. If something looks like it needs a shadow at rest, it needs a better background strategy instead.

## 5. Components

Functional like Docker Hub. Each component is purposeful and trim — no padding inflation, no decorative borders, no hover choreography beyond the minimum required to signal interactivity.

### Buttons
- **Shape:** Gently rounded (8px). Not pill — pill is reserved for filter chips only.
- **Primary** (`.btn-primary`): Warm Terracotta background, Light on Dark text, 8px 18px padding, 13px Inter 600. The only fully-filled button in the system.
- **Hover / Focus:** Background shifts to Terracotta Deep (`oklch(49% 0.13 35)`), 0.12s transition. Focus ring: 2px Warm Terracotta, 2px offset.
- **Outline** (`.btn-outline`): Transparent background, Warm Terracotta text, `1px solid oklch(57% 0.14 35 / 0.35)` border at rest. Hover fills with Terracotta Pale, border solidifies to full opacity.
- **Large modifier** (`.btn-lg`): 11px 26px padding, 14px font, 8px radius. Used for hero and CTA CTAs only.
- **CTA Ghost** (on dark backgrounds): Transparent, Light on Dark text at 0.7 alpha, `1px solid oklch(93% 0.01 52 / 0.2)` border. Hover raises alpha on both.

### Chips
- **Default** (`.filter-pill`): Card Surface background, Parchment Border border, pill radius (100px), JetBrains Mono 10.5px, Muted Field text.
- **Active** (`.filter-pill.active`): Terracotta Pale background, Warm Terracotta border at 0.35 alpha and text. The active state is immediately readable without requiring icon or checkmark.
- **CRM Chip** (`.crm-chip`): Smaller variant (9.5px, 2px 6px padding, 3px radius). Subtle Rule text, Parchment Border. Identifies HubSpot/Salesforce compatibility in card footer.

### Cards / Containers
The Agent Card is the signature component of this system. It mirrors Docker Hub's image card aesthetic: domain-colored avatar with initials, agent name + namespace, status pill, 2-line clamped description, action buttons, and a footer tray with CRM chips and check count.

- **Corner Style:** Gently rounded (8px radius).
- **Background:** Card Surface (`oklch(99.5% 0.004 52)`). Footer tray uses a slightly deeper tint (`oklch(99% 0.005 52)`).
- **Shadow Strategy:** Flat at rest. Hover: `0 2px 12px oklch(17% 0.012 50 / 0.07)` + border shift to `oklch(79% 0.01 50)`.
- **Border:** 1px Parchment Border at rest. Darkens on hover.
- **Internal Padding:** 16px 18px in the card body. 9px 18px in the card footer tray.
- **Avatar:** 44×44px, 8px radius. Background and text color are domain-specific (each of the 11 domains has its own OKLCH tint). Initials derived from the agent name with the `le-` prefix stripped.
- **Status Pill:** 9px JetBrains Mono, 3px 7px padding, 4px radius. Green for live, Terracotta for beta, grey for soon, ghost for planned.
- **Footer Tray:** Separated by a 1px border at `oklch(93% 0.007 52)`, slightly deeper card background. CRM chips left-aligned, check stat right-aligned.

### Navigation
- **Style:** Sticky, 54–56px height. Background is page color at 0.95–0.96 alpha with `backdrop-filter: blur(12px)`. Bottom border: 1px Parchment Border.
- **Logo:** Cormorant Garamond 20px 600. `Rev` in Warm Terracotta, `town` in Revenue Ink.
- **Links:** Inter 13px 500, Muted Field at rest, Revenue Ink on hover. No underlines, no indicator bars.
- **CTA button:** Primary button, compact (7px 16px). Right-aligned.
- **Mobile:** Nav links hidden below 700–720px. Logo and CTA button remain.

### Action Buttons (Catalog)
Small tertiary buttons within the agent card — distinct from page-level buttons.

- **Run →** (`.action-run`): JetBrains Mono 10px 500, 5px 11px padding, 5px radius, Warm Terracotta background. Identical brand signal as the primary button, scaled to card context.
- **Ghost** (`.action-ghost`): Same sizing, transparent background, Parchment Border border, Muted Field text. For "Fork," "Copy for Claude," "Request early access."

## 6. Do's and Don'ts

### Do:
- **Do** use Warm Terracotta exclusively on interactive elements: primary buttons, active filter states, Run actions, the `Rev` wordmark, and hover text links.
- **Do** use JetBrains Mono for every technical identifier in the catalog: agent names, filter pills, status pills, CRM chips, check counts, hub stats, code blocks.
- **Do** tint every neutral toward hue 50–52 in OKLCH — page backgrounds, card surfaces, footer. No pure white, no cool grey.
- **Do** use OKLCH for all color declarations. The warm-tinting logic depends on consistent hue and chroma — hex approximations drift.
- **Do** differentiate card states visually: live cards show Run/Fork actions; soon cards show "Request early access"; planned cards show nothing below the description. The catalog communicates status through structure, not just badge color.
- **Do** keep the card hover change minimal: border color shift + `0 2px 12px` shadow only. Hover is a signal, not a performance.
- **Do** cap body copy line length at 65ch on prose surfaces. Agent card descriptions are clamped to 2 lines with `-webkit-line-clamp`.

### Don't:
- **Don't** use gradient text (`background-clip: text` with a gradient). Prohibited in all contexts.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored side stripe on cards, callouts, or list items. Rewrite with full borders, background tints, or nothing.
- **Don't** use glassmorphism (`backdrop-filter: blur` + semi-transparent colored surface) as decoration. The nav uses backdrop blur functionally on a near-opaque background — that is the only permitted use.
- **Don't** reproduce the hero-metric template: big number, small label, grid of stats. Replace with an inline mono metadata line.
- **Don't** use generic AI product aesthetics: gradient blobs, neon accents, purple/blue/glass combinations, "10x your pipeline" or "supercharge your CRM" copy.
- **Don't** design to look like it was generated — sloppy spacing, unrefined mock proportions, every component at the same visual weight. If it looks like a Figma prototype that was never refined, it violates the Ops Room standard.
- **Don't** use pure `oklch(100% 0 0)` or `oklch(0% 0 0)` anywhere in the system. Every neutral carries warmth.
- **Don't** introduce a second accent color. Commit Green exists for status signaling only — it is not a secondary brand color and must not be used for emphasis, links, or decoration.
- **Don't** animate layout properties (width, height, padding, margin). Transition color, opacity, box-shadow, and border-color only.
- **Don't** use em dashes in copy. Use commas, colons, semicolons, or periods.
