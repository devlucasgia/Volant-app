Ajustes visuais finos na tela de Planejamento Inteligente. Escopo reduzido e sem alteração de lógica.

## Mudanças

### 1 — Herói com destaque mais intenso (`src/components/planejamento/PainelResumo.tsx`)
Substituir o wrapper do card herói por:
```tsx
<div className="relative overflow-hidden rounded-2xl border border-primary/25
  bg-gradient-to-br from-primary/[0.14] via-primary/[0.04] to-transparent p-5
  shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.6)]">
  {/* glow radial canto superior direito */}
  <div className="pointer-events-none absolute -right-6 -top-6 h-44 w-44
    rounded-full bg-primary/[0.12] blur-2xl" />
  ...
</div>
```

### 2 — Valores META e R$/KM com gradiente adaptativo (`src/components/planejamento/PainelResumo.tsx`)
Aplicar `bg-gradient-to-b from-foreground to-emerald-200 bg-clip-text text-transparent text-4xl font-bold tabular-nums leading-none` em ambos os valores grandes. O gradiente inicial usa `foreground` em vez de branco puro para manter legibilidade no tema claro.

### 3 — /km menor e alinhado ao baseline (`src/components/planejamento/PainelResumo.tsx`)
Separar o valor do sufixo no "R$/km mínimo":
```tsx
<div className="flex items-baseline gap-0.5">
  <span className="bg-gradient-to-b from-foreground to-emerald-200 bg-clip-text text-transparent text-4xl font-bold tabular-nums leading-none">
    {fmtBRL2(s.homeSmartRpkGross).replace("R$", "").trim()}
  </span>
  <span className="text-lg font-semibold text-emerald-200/70 leading-none self-end mb-0.5">
    /km
  </span>
</div>
```
Manter o lado esquerdo (META) com a formatação de moeda completa no mesmo estilo de texto.

### 4 — Ícone do header: Brain → Compass (`src/pages/PlanejamentoInteligente.tsx`)
Trocar o import e o ícone dentro do `PlanHeader`. Nenhuma outra alteração nesse arquivo.

### 5 — Ícone do eyebrow: ArrowRight → GitCompare (`src/components/planejamento/PainelResumo.tsx`)
Substituir o ícone da seção "Plano vs realizado" por `GitCompare`. Remover `ArrowRight` do import se não for mais usado em outro local do componente.

## Validação
1. Build TypeScript sem erros.
2. Card herói com gradiente e glow visíveis.
3. Valores META e R$/KM em gradiente adaptativo (legível no claro e no escuro).
4. `/km` notavelmente menor que o número, alinhado ao baseline.
5. Header exibindo ícone Compass.
6. Eyebrow "Plano vs realizado" com ícone GitCompare.
7. Toggle bruto/líquido, animações, botões Ajustar/Refazer e cálculos inalterados.