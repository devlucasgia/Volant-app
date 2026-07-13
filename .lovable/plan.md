# Sprint — Tours de ganho/gasto: ajustes finos + balão remodelado

Consolida 6 frentes sobre o estado atual dos tours (`earningsTour.ts` / `expensesTour.ts`), sem alterar cálculos, save ou lógica de dados.

## 1. Debounce de avanço (~900ms) — `src/components/EntryDrawer.tsx`

Criar `advanceTimers = useRef<Record<string, number>>({})` e helper `debouncedNotify(actionId, ready)`:
- Se `ready=false` ou nova mudança: cancela timer pendente.
- Se `ready=true`: agenda `notifyAction(actionId)` em 900ms.
- Cleanup em `useEffect(() => () => { clear all timers }, [])`.

Trocar as 4 funções internas do drawer:
- `notifyFilledHours(next)` → `debouncedNotify("filled-hours", (next??0) > 0)`
- `notifyFilledKm(...)` → mantém cálculo `hasTotal || hasRange`, envolve em `debouncedNotify("filled-km", ...)`
- `notifyFilledEarningValues(arr)` → `debouncedNotify("filled-earning-values", arr.some(p => (p.gross??0)>0 && (p.rides??0)>0))`
- `notifyFilledExpenseValue(next)` → `debouncedNotify("filled-expense-value", (next??0) > 0)`

Efeito colateral desejado: girar horas e depois ajustar minutos não pula etapa; digitar "150" não avança no "1".

## 2. Glow só na plataforma nova — `EntryDrawer.tsx` (map de platforms)

No `.map` das plataformas, marcar `data-tour="entry-platform-last"` apenas na última linha via wrapper `<div>` (preservando `key={row.uid}`). Se já houver wrapper, adicionar direto nele.

## 3. Novo passo: preencher a 2ª plataforma

**3a. `EntryDrawer.tsx`** — nova função:
```
notifyFilledSecondPlatform(arr) →
  debouncedNotify("filled-second-platform", arr.filter(valid).length >= 2)
```
Chamar junto de `notifyFilledEarningValues(arr)` no onChange do map.

**3b. `earningsTour.ts`** — inserir passo entre `used-add-platform` e `saved-earning`:
- target: `[data-tour="entry-platform-last"]`
- title: "Preenche o outro app"
- body: "Coloca o valor e as corridas da nova plataforma também."
- icon: 🚗, hint: "Preenche os valores da nova plataforma"
- advance: "action", actionId: "filled-second-platform", placement: "top"

## 4. Passo final do gasto cerca "Por app" + "Por gastos"

**4a. `src/pages/Dashboard.tsx`** — no `<section key="appsExpenses">` (~linha 1298) adicionar `data-tour="home-earnings-expenses"`.

**4b. `expensesTour.ts`** — trocar target do passo final para `[data-tour="home-earnings-expenses"]`, título "Ganhos e gastos na Home", body atualizado; manter `advance:"next"` sem `spotlight:false` (mantém spotlight+glow).

**4c. `TourOverlay.tsx`** — desacoplar "modo none" de `isLast`. Novo cálculo:
```
const noHighlight = step.spotlight === false || !rect;
const mode = noHighlight ? "none" : insideDrawer ? "glow" : "spotlight";
```
No `earningsTour.ts`, o passo "Prontinho!" recebe `spotlight: false` (fica só balão centralizado, como hoje).

## 5. Encadear ganho → gasto — `src/context/TourContext.tsx`

No `finish()`, após `markSeen(id)`, se `id === "earnings"` chamar `startTour("expenses", expensesTourSteps)` com pequeno `setTimeout(400)` para a Home reassentar após o drawer fechar. Como `startTour` já é no-op quando `tour_expenses_seen=true`, é idempotente.

Import de `expensesTourSteps` direto no TourContext. Se aparecer ciclo de import na build, fallback: disparar `window.dispatchEvent(new CustomEvent("volant:tour-finished", { detail: { id } }))` e o Dashboard escuta e chama `startTour("expenses", ...)`. Manter o gatilho atual do useEffect no Dashboard como rede de segurança.

## 6. Balão remodelado — `TourOverlay.tsx` + `TourContext.tsx`

**6a. Estender `TourStep`** com campos opcionais:
- `icon?: string` — emoji temático no cabeçalho
- `hint?: string` — texto da pílula de dica (passos de ação)
- `spotlight?: boolean` — default true; false = só balão

**6b. Visual do `PopoverContent`:**
- Fundo elevado: `bg-[hsl(var(--card))]` com tom mais claro (usar `bg-card` com override ou nova variável surface-elevated); borda `border-white/10`; sombra forte `shadow-[0_20px_50px_-10px_rgba(0,0,0,0.75),0_4px_12px_-2px_rgba(0,0,0,0.5)]`.
- Cabeçalho em flex: quadrado `bg-primary/14 rounded-[10px] h-9 w-9` com `step.icon`; ao lado eyebrow "PASSO X DE Y" + título.
- Corpo: `step.body` (como hoje).
- Pílula de dica quando `advance==="action" && hint`: chip `bg-primary/12 border border-primary/28 text-primary rounded-full px-3 py-1 text-[12px]` (sem emoji de mão).
- Rodapé: barra de progresso à esquerda (`track bg-white/9`, `fill bg-gradient-to-r from-primary via-primary to-primary/70`, width `((i+1)/steps.length)*100%`) + "Pular" + botão "Próximo/Concluir" (só quando `advance==="next"`).

**6c. Preencher `icon` em cada passo:**
- Ganho: 🚀 (fab), 💰 (novo ganho), ⏱️ (horas), 🛣️ (km), 💰 (valor), ➕ (add plataforma), 🚗 (2ª plataforma), ✅ (salvar), 👀 (hero), 🎉 (prontinho)
- Gasto: 🧾 (fab), 💸 (novo gasto), 🏷️ (categoria), 💸 (valor), ✅ (salvar), 🔄 (ganhos e gastos)

**6d. Preencher `hint` nos passos de ação** com micro-instruções: "Toca no +", "Escolhe Novo ganho", "Registra suas horas", "Digita o km do dia", "Preenche valor e corridas", "Adiciona outro app", "Preenche a nova plataforma", "Toca em Salvar", "Alterna Bruto/Líquido", "Escolhe a categoria", "Digita o valor".

## Arquivos afetados

- `src/components/EntryDrawer.tsx` — debounce, `entry-platform-last`, `notifyFilledSecondPlatform`.
- `src/context/TourContext.tsx` — campos novos em `TourStep`, encadeamento no `finish`.
- `src/components/tour/TourOverlay.tsx` — modo `none` por `spotlight`, novo layout do balão, barra de progresso, pílula de dica.
- `src/lib/tours/earningsTour.ts` — passo novo da 2ª plataforma, `icon`+`hint` em todos, `spotlight:false` no "Prontinho!".
- `src/lib/tours/expensesTour.ts` — target do passo final, `icon`+`hint` em todos.
- `src/pages/Dashboard.tsx` — `data-tour="home-earnings-expenses"` no section unificado.

## Validação manual

1. Horas: girar sem avançar; ajustar minutos; avanço ~1s após parar.
2. KM: digita "150" completo sem avançar no "1".
3. Valores: preenche com calma, avança ao estabilizar.
4. 2ª plataforma: adiciona app → glow só na linha nova → passo pede preencher → só então vai pro Salvar.
5. Gasto final: "Por app"+"Por gastos" cercados juntos, resto escurecido.
6. Concluir ganho → gasto inicia sozinho (sem sair/voltar).
7. Balão elevado com sombra, ícone, barra de progresso, pílula sem mão.
8. "Prontinho!" do ganho: só balão centralizado, sem glow.
