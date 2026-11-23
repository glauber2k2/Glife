Dark inverse pill with highlighter swatches and icon actions that rises (emph spring) when a verse is selected.

```jsx
<div style={{position:'relative'}}>
  <SelectionToolbar open={sel!=null} color={c} onColor={setC} style={{bottom:82}}
    actions={[{icon:'pencil-line',label:'Anotar'},{icon:'copy',label:'Copiar'},{icon:'trash-2',label:'Remover marca'},{icon:'check',label:'Pronto'}]} />
</div>
```
