Ajustes visuais e UX no painel de Planejamento Inteligente. Sem alteração de lógica.

## Mudanças

### 1 — Herói: gradiente real + glow (`PainelResumo.tsx`)
Substituir wrapper do card herói com classes EXATAS:
```tsx
<div className="relative overflow-hidden rounded-2xl border border-primary/25
  bg-gradient-to-br from-primary/[0.14] via-primary/[0.04] to-transparent p-5
  shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.6)]">
  <div className="pointer-events-none absolute -right-6 -top-6 h-44 w-44
    rounded-full bg-primary/[0.12] blur-2xl" />
  ...
</div>
```
Valores META, R$/KM e "—" usam: `bg-gradient-to-b from-white to-emerald-200 bg-clip-text text-transparent text-4xl font-bold tabular-nums leading-none` (trocar `from-foreground` por `from-white`).

### 2 — Timeline pelo dia atual do mês
Já está calculada por `diaAtual / diasNoMes` no código (linhas 41-46). Confirmar fórmula `((diaAtual - 1) / diasNoMes) * 100` (já está assim). **Nenhuma mudança necessária aqui** — já implementado corretamente.

### 3 — Nome do mês usa data de criação do plano
Trocar:
```tsx
const planDate = s.originalCreatedAt ? new Date(s.originalCreatedAt) : new Date();
const mesLabel = planDate.toLocaleDateString("pt-BR", { month: "long" }).toUpperCase();
```

### 4 — Sub-labels movidos para dentro dos cards
Remover os blocos `<div className="mb-1 flex items-center gap-1 ...">PLANO DE {mesLabel}</div>` e `<div className="mb-1 ... ATÉ AGORA">` que ficam ACIMA dos cards. Inserir cabeçalho interno no topo de cada card:

Card esquerdo:
```tsx
<div className="flex items-center gap-1.5 mb-3 text-[10px] font-semibold
                uppercase tracking-[0.14em] text-muted-foreground/60">
  <BookMarked className="h-3 w-3" /> PLANO DE {mesLabel}
</div>
```

Card direito:
```tsx
<div className="flex items-center gap-1.5 mb-3 text-[10px] font-semibold
                uppercase tracking-[0.14em] text-primary">
  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
  ATÉ AGORA
</div>
```
Padding interno dos cards passa de `p-3` para `p-3.5`.

### 5 — "KM/dia" → "KM estimado"
No card esquerdo, trocar:
```tsx
<PlanoLine label="KM estimado" value={planKmDay > 0 ? fmtKm(planKmDay * planDays) : "—"} />
```

### 6 — Contraste De/Para nos cards
Card esquerdo (Plano): borda `border-dashed border-border/40`, fundo `bg-muted/10`. Valores das `PlanoLine` ficam em `text-muted-foreground` (passar `valueClass="text-muted-foreground font-normal"` para apagar). 
Card direito (Até agora): borda `border-border/80`, fundo `bg-card/80`. "Já fiz" segue `text-primary`, "R$/km atual" segue `rpkColor`.

### 7 — Nota abaixo do card esquerdo
Inserir após o card esquerdo, dentro do mesmo `<div>` da coluna:
```tsx
<p className="mt-1.5 px-1 text-[10px] text-muted-foreground/50 leading-tight">
  Gravado no início do plano · não muda com Ajustes
</p>
```

### 8 — Brain de volta no header (`PlanejamentoInteligente.tsx`)
Trocar import `Compass` por `Brain` e o `<Compass>` no `PlanHeader` por `<Brain>`. Nenhuma outra alteração.

## Fora de escopo
planningEngine, smartKm, GuidedFlow, AjustarSheet, EmptyState, Dashboard, DataContext, toggle bruto/líquida (continua funcionando), animação de custos (mantida).

## Validação
1. Build TS limpo.
2. Herói com gradiente verde + glow visíveis.
3. Timeline reflete dia atual do mês calendário.
4. "PLANO DE {MÊS}" usa mês de `originalCreatedAt` quando existe.
5. Sub-labels dentro dos cards; bolinha pulsante verde em "ATÉ AGORA".
6. Card esquerdo apagado, direito vivo.
7. "KM estimado" mostra total (planKmDay × planDays).
8. Nota discreta abaixo do card esquerdo.
9. Ícone Brain no header.
