Modal bottom sheet (30px top radius, grabber, --scrim behind) for quick capture like "Caixa de entrada"; must live inside a position:relative container.

```jsx
<BottomSheet open={open} onClose={() => setOpen(false)} title="Caixa de entrada" subtitle="Escreva solto. A IA separa e cria os itens.">
  <Button fullWidth>Criar 2 itens</Button>
</BottomSheet>
```
