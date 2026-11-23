# Glife · App UI kit

This kit is a clickable recreation of the `App.dc.html` prototype embedded in `uploads/Organizador de vida - Design System.html`. It runs on a 340×720 phone frame and supports both light and dark modes.

- `Kit.jsx` contains the `Phone` frame, the `Enter` wrapper (staggered 40ms entry from 12px below), the sample data and `fmtBRL`.
- `HojeScreen.jsx` covers the next appointment, the meal you can tick off, reminders (TaskItem plus Desfazer), monthly spend (Out/Nov switch, AnimatedAmount, daily bars) and a collapsible devotional.
- `NotasScreen.jsx` covers search, filter chips and NoteRows. Tapping a row expands it into the `NoteDetail` screen.
- `FinancasScreen.jsx` contains `FinancasScreen`, `BibliaScreen` (verses with highlighter) and `InboxSheet` (free text → Organizar → Criar 2 itens).
- `App.jsx` holds `GlifeApp`, which wires up the TabBar, SelectionToolbar, Toast and sheet.

All the primitives come from the design-system bundle. Icons load from `assets/icons/` via `window.GLIFE_ICON_BASE`.
