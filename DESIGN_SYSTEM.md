# Anonym design system (Attio reference)

Single source of truth for product UI. Premium B2B SaaS with light + dark modes.

## Light palette

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-base` | `#FFFFFF` | Page |
| `--bg-subtle` | `#FAFAFA` | Sidebars, alt sections |
| `--text-primary` | `#0A0A0A` | Headlines |
| `--text-secondary` | `#737373` | Body / meta |
| `--border-subtle` | `#EBEBEB` | Dividers |
| `--primary` | `#0A0A0A` | Primary pill CTA |
| `--primary-fg` | `#FFFFFF` | CTA label |

## Dark palette (`html.dark`)

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-base` | `#0C0C0E` | Page |
| `--bg-subtle` | `#121214` | Sidebars |
| `--bg-card` | `#161618` | Cards |
| `--text-primary` | `#F5F5F5` | Headlines |
| `--text-secondary` | `#A1A1AA` | Body |
| `--border-subtle` | `#27272A` | Dividers |
| `--primary` | `#F5F5F5` | Inverted pill CTA |
| `--primary-fg` | `#0A0A0A` | CTA label |

Theme preference: `light` | `dark` | `system` (stored as `anonym-theme`).

Status chips use soft pastel backgrounds (green / blue / yellow / orange / red / purple), darkened for dark mode.

## Type

- **Family:** Inter
- **Display:** 700 weight, tracking `-0.035em`, large sizes
- **Body:** 16px, muted gray, line-height ~1.5–1.6

## Components

- Buttons: fully rounded pills; primary solid black; secondary white + border
- Cards: 16px radius, soft multi-layer shadow
- Badges: full pill + optional colored dot
- Tables: light header, subtle row hover, soft selection

## Layout

- Marketing max width ~1120px
- App shell: sidebar + sticky topbar
- Generous section padding (80–112px)
