## Sprint 5 — Alinhamento dos Filtros + Badge de Excedente do KM

Refinamento visual sobre o que já está em produção. Sem mudanças em `planningEngine`, queries, DataContext, summarize, DnD, AuthContext, demais cards, Histórico, Admin.

---

### Item 1 — Filtros de período mais equilibrados

Aumentar o `gap` entre os tabs flat para o grupo "respirar" e ocupar mais largura útil, sem voltar ao `flex-1` (que esticava cada tab) e sem deixar tudo comprimido no canto esquerdo. `justify-start` e `ml-auto` do ícone à direita permanecem.

**`src/components/Segmented.tsx` (tone `flat`, linha 41-42)**
- `trackClass` flat: `gap-3` → `gap-6`.

**`src/pages/Dashboard.tsx` — `PeriodBar` (linha 1145)**
- Container: `gap-3` → `gap-6`. Resto inalterado (`shrink-0`, `border-b`, `ml-auto` no calendário).

Isso cobre automaticamente Home (`PeriodBar`), Relatórios (`Segmented flat`), Histórico (`Segmented flat`) e Organização de Cards (`Segmented flat size="sm"`). Tones `default` e `contextual` ficam intactos.

---

### Item 2 — KM Inteligente: travar % em 100% + badge de excedente neutro

Espelhar o padrão do card de Meta (linhas 479-494), mas com tom **neutro** (não verde).

**`src/pages/Dashboard.tsx` — bloco do KM (linhas 614-631)**

- Calcular `kmOverPct = kmRequired > 0 && kmDriven > kmRequired ? ((kmDriven / kmRequired) - 1) * 100 : 0;`
- Linha do percentual (626-628): trocar a fórmula `(kmDriven / kmRequired) * 100` por `kmPct` (já travado em 100% na linha 593, `Math.min(100, ...)`).
- Antes do `<span>` do percentual, inserir um badge condicional quando `kmOverPct > 0`:

```tsx
{kmOverPct > 0 && (
  <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground animate-fade-in tabular-nums">
    +{num(kmOverPct, 0)}%
  </span>
)}
```

- Envolver badge + percentual em `<div className="flex shrink-0 items-center gap-1.5">` (mesmo wrapper da Meta).
- A `Progress` (linha 616-618) já usa `kmPct` travado — sem alteração.
- A cor de status (`rpkStatusTextClass`, `rpkStatusBarClass`) que conecta KM↔Performance permanece intacta. O badge é elemento adicional, neutro, não substitui essa cor.

---

### Arquivos tocados

- `src/components/Segmented.tsx` — gap do tone flat.
- `src/pages/Dashboard.tsx` — gap do `PeriodBar`, badge neutro de excedente + trava de % no card KM.

### Não tocados

`planningEngine`, queries Supabase, DataContext, summarize, DnD, AuthContext, herói, Ganhos, Gastos, Jornada, Histórico, Ajustes, Admin. Cor de status do KM (verde/laranja/vermelho/cinza) e tudo das Sprints 3 e 4 ficam como estão.

### Verificação

Playwright 360×800:
1. Home, Relatórios, Histórico, Organização de Cards: tabs alinhados à esquerda, gap visível, sem vão excessivo entre o grupo e o ícone à direita.
2. Forçar `kmDriven > kmRequired` (ex.: 320/150) e confirmar percentual em `100%`, badge `+113%` em cinza neutro, barra cheia sem extrapolar.
