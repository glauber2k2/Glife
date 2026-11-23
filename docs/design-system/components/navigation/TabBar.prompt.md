The app's bottom navigation: four icon+label tabs with a sliding --soft pill and a central outlined + for quick capture.

```jsx
<TabBar value={tab} onChange={setTab} onPlus={openInbox} items={[
  {key:'hoje',label:'Hoje',icon:'sun'},{key:'notas',label:'Notas',icon:'notebook-text'},
  {key:'fin',label:'Finanças',icon:'wallet'},{key:'biblia',label:'Bíblia',icon:'book-open'}]} />
```
