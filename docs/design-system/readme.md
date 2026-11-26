> **Substituído em 26/11/2026** pelo Glife Cobalto (`docs/design-system-cobalto/`). Continua valendo para o código atual até a Fase R do plano terminar.

# Glife Design System

Glife is a personal-organisation app ("Organizador de vida"), written in Brazilian Portuguese. Its four tabs are **Hoje** (today: next appointment, meal, reminders, monthly spend, devotional), **Notas** (notes with links), **Finanças** (spend by category, investments, transactions) and **Bíblia** (reader with highlighter). A central **+** opens the *Caixa de entrada*, a sheet where you write freely and AI splits the text into items.

**Source:** `uploads/Organizador de vida - Design System.html`. This is a bundled design-system page: direction "Glaciar" (colour/shape) + "Sinóptico" (type), v1.0, plus the `App.dc.html` prototype. The page mentions `tokens.css` (web) and `theme.js` (Expo + Reanimated), but neither was provided.

**No logo was provided.** Render "Glife" in Hanken Grotesk Light wherever a mark would go.

## Content fundamentals
- Language: pt-BR. Sentence case everywhere. Labels are short uppercase eyebrows ("PRÓXIMO COMPROMISSO").
- Tone: calm, practical and personal, with no hype. The app addresses the user implicitly, with no "você" in labels, e.g. "Escreva solto. A IA separa e cria os itens."
- Concrete data is formatted the Brazilian way: "R$ 3.184,20", "14:30", "22/11", "em 1 h 20 min". Amounts use the true minus sign: "− R$ 186,40".
- Confirmations are short and in the past tense: "2 itens criados", "Versículo copiado". Undo is a one-word ghost link: "Desfazer".
- Faith content (Almeida translation, devotionals) sits alongside everyday life without a change in tone.
- **No emoji** anywhere in the UI.

## Visual foundations
- **Colour:** cool, blue-tinted neutrals (`--bg #F1F4F7`, `--ink1 #14273B`) with one steel-blue accent (`--accent #3A6690`). State colours (`--ok/--warn/--err`) appear only when they carry meaning. Four highlighter tones (`--hl1..4`) are reserved for reading. Light and dark modes are designed together; dark is `[data-theme="escuro"]`, not an inversion of light.
- **Type:** Hanken Grotesk for all UI. Titles are large and Light (34/300, −0.035em), display figures are 44/300, labels are 11/600 uppercase at +0.08em. Crimson Pro is used only for reading (Bible, devotional, long notes). Values, times and dates use tabular numerals.
- **Layout:** 22px screen gutter. Blocks are separated by 16–18px of space plus a 1px `--line` rule. **Never use boxes or cards to group content.**
- **Surfaces:** no shadows, gradients, glows or blur at any level. Overlays (sheet, detail) separate from the page with `--scrim` plus a 1px line.
- **Radii:** controls are pills (999px). Fields are 16px, cards at rest 20px, and the sheet top 30px.
- **Lines:** hairline 1px, strike-through 1.5px, progress track 3px (2px for category bars).
- **Motion:** this is the signature of the system. Every state change animates with one of four damped springs: tap 200ms, std 300ms, emph 350ms, gentle 320ms (`--e-*` as CSS `linear()`). List items stagger 40ms and enter from 12px below. Press scales to 0.96 (0.9 on small controls). Nothing bounces, pulses or loops. Reduced motion collapses durations to near zero.
- **Hover/press:** primary buttons darken via `brightness(.94)`; other controls get a `--soft` fill. Press always uses the scale above.
- **Imagery:** none is used. The UI is purely typographic.

## Iconography
- Lucide (lucide-react-native in the app), **outline only, 1.5px stroke**, at sizes 20 (tabs, actions), 16 (inline, lists) and 13 (link chips). Icons always take the colour of the surrounding text; the accent colour is used only for selection.
- The `Icon` component loads `lucide-static@0.460.0` from unpkg and forces a 1.5px stroke. Local copies of the 29 brand icons, already at 1.5px, are in `assets/icons/`. To use them offline, set `window.GLIFE_ICON_BASE`.
- No icon font, no PNGs, no emoji, and no unicode-as-icon.

## Index
- `styles.css` is the entry point. It imports `tokens/fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `motion.css` and `base.css`.
- `fonts/` holds the Hanken Grotesk, Crimson Pro and JetBrains Mono woff2 files (latin + latin-ext subsets).
- `assets/icons/` holds the Lucide SVGs.
- `guidelines/` holds the foundation cards (Colors, Type, Spacing, Motion, Brand).
- `components/` holds the React primitives (see below).
- `ui_kits/app/` holds the app recreation.
- `thumbnail.html` is the homepage tile.

## Components
- core: **Icon**
- actions: **Button**, **IconButton**
- forms: **TextField**, **SearchField**, **Checkbox**, **Switch**, **SegmentedControl**, **Chip**
- content: **PageHeader**, **Section**, **AnimatedAmount**, **ProgressTrack**
- lists: **LinkChip**, **TaskItem**, **ExpandableItem**, **NoteRow**
- reading: **Verse**, **SelectionToolbar**
- feedback: **Toast**, **BottomSheet**
- navigation: **TabBar**

### Intentional additions
These are patterns shown in the source that aren't named as components there:
- **Icon** wraps the Lucide glyph set.
- **PageHeader**, **Section**, **NoteRow**, **Verse** and **SelectionToolbar** are lifted directly from the prototype screens.
- **AnimatedAmount** implements the "Números que contam" (counting numbers) pattern.

## UI kits
- `ui_kits/app/` is the clickable mobile app: Hoje, Notas (with the note opening into a detail screen), Finanças, Bíblia (with highlighter) and Caixa de entrada. See its README.

## Other files
- `SKILL.md` lets this folder be used as an Agent Skill.
