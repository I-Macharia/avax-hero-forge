---
name: Rift & Rune
colors:
  surface: '#15121d'
  surface-dim: '#15121d'
  surface-bright: '#3b3744'
  surface-container-lowest: '#0f0c18'
  surface-container-low: '#1d1a25'
  surface-container: '#211e2a'
  surface-container-high: '#2c2834'
  surface-container-highest: '#37333f'
  on-surface: '#e7dff0'
  on-surface-variant: '#e8bcb9'
  inverse-surface: '#e7dff0'
  inverse-on-surface: '#322e3b'
  outline: '#ae8785'
  outline-variant: '#5e3f3d'
  surface-tint: '#ffb3ae'
  primary: '#ffb3ae'
  on-primary: '#68000c'
  primary-container: '#ff5353'
  on-primary-container: '#5c0009'
  inverse-primary: '#c0001f'
  secondary: '#deb7ff'
  on-secondary: '#4a007f'
  secondary-container: '#7300c1'
  on-secondary-container: '#d9aeff'
  tertiary: '#57df88'
  on-tertiary: '#00391a'
  tertiary-container: '#00a658'
  on-tertiary-container: '#003116'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ae'
  on-primary-fixed: '#410005'
  on-primary-fixed-variant: '#930015'
  secondary-fixed: '#f1dbff'
  secondary-fixed-dim: '#deb7ff'
  on-secondary-fixed: '#2d0050'
  on-secondary-fixed-variant: '#6a00b2'
  tertiary-fixed: '#76fca1'
  tertiary-fixed-dim: '#57df88'
  on-tertiary-fixed: '#00210d'
  on-tertiary-fixed-variant: '#005228'
  background: '#15121d'
  on-background: '#e7dff0'
  surface-variant: '#37333f'
  card-surface: '#1A1624'
  popover-surface: '#15111F'
  muted-text: '#AEA0B1'
  border-rune: '#363040'
  avalanche-glow: '#FF5A47'
  mana-glow: '#C36DFF'
  input-base: '#292433'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  stat-value:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 64px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system embodies a **Heroic Fantasy** aesthetic fused with a cutting-edge Web3 technical layer. It is designed to evoke the feeling of a high-stakes RPG quest log—adventurous, prestigious, and deeply immersive. The style centers on the concept of "Atmospheric Layering," where UI elements appear as enchanted artifacts floating over a dark, cosmic void.

The visual direction is **Modern-Brutalist Minimalism with Glassmorphism**. It utilizes heavy backdrop blurs and semi-transparent surfaces ("Rune Glass") to create depth without clutter. The interface feels like a digital HUD (Heads-Up Display) for an adventurer, balancing dense information density with glowing, high-energy accents that signal rarity and achievement. High contrast is maintained between the nocturnal background and luminous text to ensure the experience feels premium and accessible.

## Colors

The color palette is built on the elemental forces of shadow, fire, and magic. 

- **Primary (Volcanic Spark):** A fiery red-orange used for core actions, Avalanche network branding, and critical highlights.
- **Secondary (Cosmic Mana):** A rich purple used for on-chain interactions and secondary brand expressions.
- **Tertiary (Elixir of Life):** A vivid green reserved exclusively for success states, completed quests, and positive growth indicators.
- **Neutral (Nocturnal Void):** A deep, violet-tinted black that serves as the canvas, absorbing light to let the "glow" effects pop.

**Gradients & Glows:**
The "Brand Gradient" is a linear transition from `#FF2A39` to `#9339E1`. UI elements should utilize "Glow Rings"—soft, outer shadows tinted with the primary or secondary color—to indicate active or legendary status.

## Typography

The typography system strikes a balance between "Adventurous Precision" and "Functional Readability."

**Display & Stats:**
`Space Grotesk` is the primary voice for all heroic elements. It is used for headlines, statistics, and buttons. On large displays, it should be set with tight letter spacing to feel impactful and industrial. Large headers often benefit from a gradient mask using the brand colors.

**Body & Metadata:**
`Inter` provides the necessary clarity for quest descriptions, item attributes, and long-form data. It should be used for all functional text to maintain the "dApp" side of the experience.

**Labels:**
Small metadata labels should use uppercase `Space Grotesk` with wide letter spacing to create a technical, "scanned" look, reminiscent of RPG inventory tabs.

## Layout & Spacing

This design system uses a **Fluid Grid** model that emphasizes information density while maintaining clean boundaries.

- **Grid:** A 12-column system for desktop (`max-w-7xl`) and a 1-column system for mobile. Center-aligned 8-column layouts are preferred for leaderboards and item details to focus the user's attention.
- **Rhythm:** A 4px baseline rhythm ensures all components align perfectly. Use `16px (md)` for internal card padding and `24px (lg)` for gaps between major modules.
- **Mobile Reflow:** In mobile view, cards and inventory slots should stack vertically, but horizontal scrolling "carousels" are permitted for item categories (e.g., weapon types) to save vertical space.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** and **Luminous Accents** rather than traditional shadows.

- **Background:** The base layer is the `Nocturnal Void`.
- **Containers:** Content sits in `Rune Glass` containers (`bg-card/70`) with a `backdrop-blur`.
- **Outlines:** Use "Rune Boundaries" (low-opacity obsidian borders) for standard items. 
- **Active Elevation:** "Elevated" or "Legendary" items do not use shadows; instead, they use a `glow-ring` effect—a colored outer glow using `primary` or `secondary` at 30-50% opacity. This simulates an object emitting magical energy.
- **Interaction:** On hover, containers should increase in border-opacity and scale slightly (1.02x), creating a tactile "magnetic" feel.

## Shapes

The shape language is "Softly Geometric." While the fantasy theme might suggest jagged edges, the modern dApp context requires professional, rounded corners for ease of use.

- **Standard Containers:** Use the `rounded` (0.5rem) setting for cards and inputs.
- **Feature Cards:** Use `rounded-lg` (1rem) for hero modules or large item displays.
- **Pills:** Status tags (e.g., "MINTED", "LIVE") should use `rounded-full` to distinguish them from interactive buttons.
- **Borders:** All borders should be thin (1px) to maintain a refined, high-tech look.

## Components

**Buttons:**
- **Primary (Rift-Fused):** Filled with the Brand Gradient. Text is high-contrast white. Features a persistent primary-red glow.
- **Secondary (Relic Outline):** Transparent background with a `border-rune`. On hover, the border glows volcanic red and the background becomes slightly more opaque.

**Badge Cards (NFTs):**
- **Unlocked:** High saturation, glowing borders, and a subtle radial gradient background that matches the item's rarity.
- **Locked:** Greyscale, muted text, and a lower opacity background (`bg-card/40`) to indicate a "discovery needed" state.

**Inputs:**
- Background uses `input-base`. Borders are `border-rune`. 
- Focus state: The border-color shifts to `primary` and a small `ring` of primary red appears, signifying the element is "charged."

**Progress Bars:**
- Track: Deep charcoal/muted violet.
- Fill: A solid lava-red gradient. For "experience" bars, use the magical purple gradient.

**Lists & Leaderboards:**
- Rows should alternate with subtle background shifts or be separated by thin `border-rune` lines. Top-ranked players should have a soft primary-glow background.

**Chips & Tags:**
- Small, uppercase labels with a subtle background tint (e.g., `primary/20`) to categorize items without distracting from the main content.