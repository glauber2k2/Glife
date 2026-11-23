Single-line outlined input with a floating label; use for any form value (descrição, valor, data).

```jsx
<TextField label="Descrição do gasto" value={v} onChange={setV} />
<TextField label="Valor" value="R$ 0,00" numeric error="Informe um valor maior que zero." />
```

- 54px tall, radius 16, 1px --line border → --accent on focus, --err on error. Label shrinks to 77% and lifts 10px with the std spring.
