Pill-shaped button; use primary for the single main action on a screen, secondary/ghost for everything else.

```jsx
<Button>Salvar gasto</Button>
<Button variant="secondary" icon="sparkles">Organizar</Button>
<Button variant="ghost" size="sm">Desfazer</Button>
<Button fullWidth>Criar 2 itens</Button>
```

- Heights 48 / 40, radius pill. Hover: primary darkens 6% (brightness .94), others get --soft. Press: scale .96 with the tap spring.
- Disabled = 60% opacity, not-allowed cursor. No shadows, no gradients.
