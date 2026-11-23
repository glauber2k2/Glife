Selectable pill for filters and categories; selected chips fill with the accent.

```jsx
<Chip label="Mercado" selected />
<Chip size="sm" label="Todas" selected={f==='Todas'} onClick={() => setF('Todas')} />
```

- Use LinkChip (not Chip) for non-interactive references between items.
