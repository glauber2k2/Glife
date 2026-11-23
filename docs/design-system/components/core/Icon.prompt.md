Lucide outline icon at 1.5px stroke that inherits the surrounding text colour — use for every glyph in Glife UI.

```jsx
<Icon name="wallet" size={20} />
<Icon name="check" size={16} color="var(--ok)" />
```

- Sizes: 20 (tab bar, actions), 16 (inline/list), 13 (link chips).
- Never filled icons, never emoji. Colour = text colour; accent only for selected state.
- Brand icon set copies live in `assets/icons/` (already 1.5 stroke); set `window.GLIFE_ICON_BASE` to that folder to load offline.
