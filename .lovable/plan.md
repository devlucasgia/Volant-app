
## Respostas rápidas

**1. Manter KM Inteligente e Metas Inteligentes separados?**
Não. Depois das mudanças do Painel, as duas telas viraram redundantes — o Painel já mostra meta, dias, KM/dia, R$/km mínimo e R$/km inteligente; o accordion "Detalhes do plano" e o "Ajustar" cobrem os ajustes finos. Manter dois atalhos extras polui a navegação e duplica conceitos. Vamos **remover os cards "Mais ajustes"** do Painel e absorver o que falta dentro do próprio Painel/Ajustar.

**2. Bug da folga no dia 16/jun (print 3)**
Confirmado. A lógica de folga só dispara quando `period === "day"`. O usuário selecionou 16/jun pelo seletor de data customizado (período `custom`, intervalo de 1 dia), e por isso a folga não aparece. Corrigir para também considerar `custom` quando o intervalo é um único dia fora de `planningSelectedDates`.

**3. Melhorias simples sugeridas (UX + 1 feature leve)**
- **Sublabel do R$/KM Inteligente da Home com tom de status** (verde/âmbar/vermelho) espelhando o status do plano — hoje o número é neutro, custa pouco e dá leitura imediata.
- **Banner compacto "Folga" no Painel** quando hoje é folga, com link rápido para "Trabalhar mesmo assim hoje" (adiciona o dia ao `planningSelectedDates`). Resolve o caso real do motorista que decide trabalhar num dia de folga.
- **Botão "Ver no calendário"** no accordion "Detalhes do plano" abrindo o passo 3 do GuidedFlow (já existe via Ajustar→Dias) — mero atalho.

## O que será feito

### A. Unificação das telas
- `src/pages/PlanejamentoInteligente.tsx`: remover o bloco "Mais ajustes" com os dois `HubCard` (Metas/KM). Painel fica enxuto: Hero meta, Hero R$/KM, Detalhes, Custos, Ajustar/Refazer.
- `src/App.tsx`: manter as rotas `/ajustes/planejamento/metas` e `/ajustes/planejamento/km` por compat (deep links antigos), mas remover do menu de Ajustes (`src/pages/Settings.tsx`) se existirem entradas diretas.
- Verificar `Settings.tsx` e `BottomNav` para qualquer link direto às duas telas e remover.

### B. Correção da folga em período custom (1 dia)
- `src/pages/Dashboard.tsx` — `isFolga`:
  - Considerar também `period === "custom"` quando `customRange.from === customRange.to` (single day).
  - Comparar o ISO desse dia único contra `planningSelectedDates`.
- Garantir que `isFolga` use o ISO do dia ativo (hoje no `day`, dia selecionado no `custom`), não sempre `todayIsoStr`.
- Texto do badge ajustado: "Folga programada" (hoje) ou "Dia de folga" (custom de outro dia).

### C. Polimento R$/KM Inteligente
- `src/pages/Dashboard.tsx`: aplicar tom no número/ícone do card R$/KM Inteligente conforme `plan.status` (`ahead` emerald, `on_track` neutro, `behind` amber, `needs_adjustment` rose).

### D. Ação "Trabalhar hoje" no banner de folga (Home)
- Quando `isFolga` no `day`, adicionar um botão pequeno "Trabalhar hoje mesmo assim" abaixo do badge. Ao clicar, atualizar `settings.planningSelectedDates` (insere o dia, ordena) via `updateSettings` e mostra toast.
- Sem migration; campo já existe.

### Arquivos
- `src/pages/PlanejamentoInteligente.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Settings.tsx` (apenas se houver links diretos)
- `.lovable/plan.md` (atualizar status da sprint)

### Fora de escopo
- Schema, auth, Stripe, motor de cálculo (`planningEngine.ts`, `planejamento.ts`), Metas Inteligentes/KM Inteligente standalone (ficam intocadas, só somem do hub).
