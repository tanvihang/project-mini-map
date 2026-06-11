# Design Tokens & Style Guide

> Ethereal light theme. Solid colors — no glassmorphism. The book is the centerpiece.

---

## Environment

The surrounding "desk" is ethereal and misty — soft warm tones with a subtle radial glow.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-environment` | `#f8f6f2` → `#efe9df` | Background gradient (soft morning mist) |
| `--bg-glow` | `rgba(220, 200, 160, 0.15)` | Radial glow center |

---

## Color Palette

### Book

| Token | Value | Usage |
|-------|-------|-------|
| `--book-cover` | `#3d2e1f` | Spine, cover edges |
| `--book-page` | `#faf7f0` | Page background |
| `--book-page-edge` | `#e8e0d3` | Page stack edge |
| `--book-text` | `#2c2416` | Narrative text on page |
| `--book-text-muted` | `#8a7e6e` | Secondary text, timestamps |

### Panels (solid, no glass)

| Token | Value | Usage |
|-------|-------|-------|
| `--panel-bg` | `#f5f2ec` | Chat sidebar, top bar |
| `--panel-border` | `#e0d8cc` | Panel separators |
| `--panel-text` | `#1a1a1a` | UI text |

### UI

| Token | Value | Usage |
|-------|-------|-------|
| `--white` | `#ffffff` | Top bar, card backgrounds |
| `--input-bg` | `#fafaf9` | Text input field |
| `--input-border` | `#d4ccc0` | Input border |
| `--input-focus` | `#b8a88a` | Input focus ring |
| `--btn-primary` | `#3d2e1f` | Primary button (book-cover brown) |
| `--btn-primary-text` | `#faf7f0` | Text on primary button |

### Feedback

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#5a8a6a` | Completion banner, checkmarks |
| `--error` | `#c2554d` | Error banners |
| `--warning` | `#c47a3a` | Tight budget badge |

---

## Mood Accents (per choice type)

Each choice card type has its own accent — used for the card border and type badge.

| Type | Accent | Gradient |
|------|--------|----------|
| `move` 🏙️ | `#5b7fa5` | slate → steel blue |
| `activity` 🥾 | `#4a7c59` | pine → moss green |
| `explore` 🏛️ | `#c4943a` | amber → warm gold |
| `slow` 😌 | `#c47a5a` | clay → terracotta |
| `recommended` ⭐ | `#c4943a` | gold (same as explore) |
| `tight-budget` ⚠️ | `#c47a3a` | amber warning |

---

## Typography

### Font Families

| Token | Stack | Usage |
|-------|-------|-------|
| `--font-journal` | `'Lora', 'Noto Serif SC', serif` | Narrative, senses, dialogues |
| `--font-ui` | `'Inter', 'Noto Sans SC', sans-serif` | Buttons, labels, inputs, cards |
| `--font-mono` | `'JetBrains Mono', monospace` | Money amounts (tabular nums) |

> Chinese text falls through to Noto Serif SC (journal) or Noto Sans SC (UI) since Lora and Inter lack CJK glyphs.

### Scale

| Token | Size / Leading | Weight | Usage |
|-------|---------------|--------|-------|
| `--text-display` | 32px / 1.3 | 700 | Day number header |
| `--text-title` | 24px / 1.4 | 600 | Day title |
| `--text-body` | 18px / 1.8 | 400 | Narrative body |
| `--text-dialogue` | 16px / 1.6 | 400 italic | Dialogue text |
| `--text-small` | 14px / 1.5 | 400 | Senses block, cultural tips |
| `--text-ui-lg` | 18px / 1.4 | 600 | Choice card title |
| `--text-ui` | 14px / 1.5 | 400 | Choice description, tags |
| `--text-ui-sm` | 12px / 1.4 | 400 | Page numbers, captions |
| `--text-money` | 16px / 1.2 | 500 tab | Money amounts |

---

## Spacing & Layout

### Book Geometry

| Token | Value |
|-------|-------|
| `--page-width` | 420px |
| `--page-padding` | 48px |
| `--gutter-width` | 32px |
| `--book-spread-width` | 872px (420 × 2 + 32) |

### Sidebar

| Token | Value |
|-------|-------|
| `--chat-panel-width` | 320px |
| `--chat-panel-gap` | 40px |

### General Spacing Scale

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |

---

## Breakpoints

| Token | Value | Target |
|-------|-------|--------|
| `--bp-desktop` | ≥ 1280px | Full book + chat panel side by side |
| `--bp-laptop` | 1024–1279px | Book only, chat as overlay |
| `--bp-tablet` | 768–1023px | Single page view (no spread) |
| `--bp-mobile` | < 768px | Stacked, simplified layout |

> MVP targets desktop only. Tablet/mobile are deferred.

---

## Shadows & Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-book` | `0 2px 24px rgba(0,0,0, 0.08)` | Book drop shadow on desk |
| `--shadow-card` | `0 1px 4px rgba(0,0,0, 0.06)` | Choice card, auth card |
| `--shadow-elevated` | `0 4px 16px rgba(0,0,0, 0.1)` | Dropdowns, overlays |
| `--border-page` | `1px solid #e8e0d3` | Page edge |
| `--border-card` | `1px solid #e0d8cc` | Card border |
| `--radius-sm` | 4px | Inputs |
| `--radius-md` | 8px | Cards |
| `--radius-lg` | 12px | Panels |
