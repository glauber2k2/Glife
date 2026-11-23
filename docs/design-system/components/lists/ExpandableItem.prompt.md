Transaction-style list row (icon circle, title, meta, tabular amount) that expands on tap to reveal LinkChips.

```jsx
<ExpandableItem icon="shopping-cart" title="Mercado Pão de Mel" meta="Ontem, 19:42 · Mercado" amount="− R$ 186,40"
  links={[{icon:'notebook-text',label:'Lista da semana'},{icon:'image',label:'Cupom fiscal'}]}
  expanded={open} onToggle={setOpen} />
```

- Income rows: `positive` + "+ R$ …". Use the true minus sign "−".
