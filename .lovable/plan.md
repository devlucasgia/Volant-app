## Escopo

Arquivo único: `src/components/onboarding/OnboardingFlow.tsx`.
Nenhum outro arquivo é tocado. O tour mantém ordem, contagem de passos, navegação, "Pular", progresso, animações de transição e gatilhos de abertura. Só os mocks internos de cada passo e algumas strings de copy mudam.

Princípio: replicar VISUALMENTE as telas reais com dados de exemplo. Não plugar `TimerContext`, `DataContext`, hooks ou componentes reais dentro do tour — isso quebraria o isolamento dos mocks e exigiria providers que o tour não tem. Réplica visual fiel é o caminho aprovado pela própria spec.

## Item 1 — Passo 2 (RegistroStep)

Refazer o conteúdo do `<PhoneFrame>`:

- **Barra inferior** (atual linhas ~344-353): manter o layout 5 colunas com FAB central, mas trocar a última aba de "Ajustes" + quadradinho genérico para o padrão real do `BottomNav`:
  - Ícone `MoreHorizontal` (lucide) + rótulo "Mais".
  - Ícones das outras abas também passam a usar os ícones reais (`Home`, `History`, `BarChart3`) em vez de quadradinhos, para ficar coerente.
- **Cena radial** (`phase === "radial"`): manter as duas pílulas "Novo ganho" / "Novo gasto" como já são (correspondem ao real).
- **Drawer** (`phase === "drawer"`, atual linhas ~417-483): substituir o mock antigo "Novo registro" (Lucro/Gasto toggle, dropdown único de plataforma, Horas + Valor) por uma réplica enxuta do `EntryDrawer` real atual:
  1. Cabeçalho "Novo ganho" (sem toggle Lucro/Gasto — o tipo já foi escolhido no menu radial).
  2. Bloco "A jornada" → "Horas trabalhadas" com representação visual da roda (`HoursWheel`): duas colunas estilo alarme mostrando `0h` e `00` separadas por `:`, sem interação (visual estático com faixa central destacada).
  3. Bloco "Quilometragem" com mini-segmented `Total / Inicial-Final` e campo "Km rodados" (Total selecionado).
  4. Bloco "Em quais apps você rodou hoje?" com um card de plataforma (Uber) mostrando "Valor recebido" (R$ 80,00, destacado em verde) e "Corridas" (8), e abaixo um link/botão "+ Adicionar plataforma".
  5. Rodapé "Cancelar / Salvar".
- A animação atual (idle → radial → drawer → idle em loop) é mantida com os mesmos timeouts.

## Item 2 — Passo 3 (JornadaStep)

Refazer o card de jornada e o drawer de encerramento:

- **Card de jornada** (atual linhas ~546-609): aproximar visualmente do `JourneyModule` real:
  - Cabeçalho com chip de status (Parado / Trabalhando / Em descanso / Encerrada).
  - Display central grande com o tempo total.
  - Linha com 3 mini-stats: Trabalhado, Descanso, KM (com valor de exemplo "12 km").
  - Botão principal pulsante:
    - `idle` → "Iniciar jornada" (gradient-success) com pulso suave `scale: [1, 1.04, 1]` em loop.
    - `running` → "Pausar para descanso" (outline) + "Encerrar jornada" (destructive outline).
    - `resting` → "Retornar do descanso" (gradient-success) + "Encerrar jornada".
    - `ended` → chip "Jornada encerrada".
  - **Reduced motion**: o pulso do botão idle é desativado quando `useReducedMotion()` retorna true.
- **Modal de meta** (`phase === "goal"`): manter, ajustando rótulos para "Meta da jornada" e botão "Iniciar jornada".
- **Drawer de encerramento** (`phase === "ended"`): substituir o mock antigo pela MESMA réplica visual do `EntryDrawer` "Novo ganho" criada no Passo 2 (extrair como subcomponente local `MockNovoGanhoDrawer` para reutilizar). Diferença: campo "Horas trabalhadas" pré-preenchido com `hoursDecimal` (calculado a partir de `workSec`) e destacado em verde, sinalizando o auto-preenchimento. Sem chamar TimerContext.
- Nenhuma chamada ao TimerContext / supabase. Tudo é mock visual com os mesmos timers/`setPhase` que já existem.

## Item 3 — Passo 4 (RelatoriosStep)

Substituir totalmente o conteúdo do `<PhoneFrame>` (linhas ~750-862). O mock atual (grade de tiles coloridos) some. Novo layout, fiel à `Reports.tsx` real:

1. Cabeçalho compacto: "Relatórios" + sub "maio de 2026".
2. Abas no topo: `Por mês` (ativo) / `Por ano` / `Personalizado`, no formato pílula segmented.
3. **Herói central** com "LUCRO LÍQUIDO" em destaque grande (verde), valor (R$ 1.112,67) e linha de apoio "Bruto R$ 1.427,01 · Gastos R$ 314,34".
4. Card "INSIGHTS INTELIGENTES" (border + ícone `Sparkles` + uma frase curta de exemplo: "Quarta foi seu melhor dia: R$ 312,40 líquidos.").
5. Card "VISÃO GERAL" em **lista** (não tiles): 4 linhas com ícone à esquerda, label e valor à direita. Para evitar conferência de matemática no mock, exibir apenas label + valor (sem o sublabel de denominador):
   - `Gauge` → Média por hora → R$ 59,46
   - `Calendar` → Média por dia → R$ 326,13
   - `Route` → R$/km → R$ 2,52
   - `Wallet` → R$/corrida → R$ 44,59
6. Gráfico "EVOLUÇÃO DIÁRIA" com chips no topo (`Lucro` ativo, `Gastos`, `KM`, `Horas`) e uma `<svg>` com a linha animada (reaproveitar a path animation que já existe). Sem grade colorida.

Cores semânticas: líquido verde, bruto info-azul, gasto vermelho, neutros em muted. Nada de roxo para corridas.

## Item 4 — Passo 5 (CustomizacaoStep)

Mudanças só de copy (linhas ~887-894):

- `description` do `StepShell`: trocar "Em Ajustes, toque no card..." por "Na aba Mais, toque no card para ativar ou desativar. Reordene pela alça ou pelas setas."
- A frase interna do `MiniSettingsCard` permanece (não menciona "Ajustes").
- Linha 1139 (Passo 6): trocar "Ajustável em Ajustes → Planejamento Inteligente." por "Ajustável em Mais → Planejamento Inteligente."

Conteúdo dos cards e a animação de toggle permanecem.

## Item 5 — Passo 6 (PlanejamentoStep)

Refazer o `<PhoneFrame>` para refletir o `PainelResumo` real, versão enxuta:

1. Cabeçalho compacto: ícone `Brain` + "Planejamento Inteligente" + sub "maio de 2026".
2. Card "OBJETIVOS DO DIA" em destaque:
   - Linha 1: ícone `Target` + "Meta R$ 224 pra faturar hoje" (verde).
   - Linha 2: ícone `Gauge` + "R$/km mínimo pra aceitar corrida: R$ 2,45" (azul/primary).
3. Card "COMPOSIÇÃO DA META" mostrando a fórmula visual:
   - "Meta bruta R$ 6.000" (azul/info, topo).
   - "= Meta líquida R$ 4.720 (verde) + Custos fixos R$ 1.280 (neutro/muted-foreground, SEM amber — amber é alerta no sistema)".
   - Rodapé pequeno em muted: "Combustível e alimentação não entram na meta, são custos variáveis." (com vírgula, sem travessão).
4. Progresso opcional: barra "Faturado no mês" R$ 2.240 / R$ 6.000 (37%), reaproveitando a animação existente.

Trocar rótulos antigos:
- "R$/km inteligente" → "R$/km mínimo pra aceitar corrida".
- "Meta mensal" permanece como rótulo do card de progresso; o card hero passa a ser "Objetivos do dia".

Números coerentes: bruta (6.000) = líquida (4.720) + custos fixos (1.280). Variáveis não somam.

Frases do bloco final (`HighlightRow`):
- "Meta diária e R$/km mínimo calculados a partir do seu plano mensal."
- "O R$/km mínimo se ajusta conforme você faturar ao longo do mês."
- "Ajustável em Mais → Planejamento Inteligente."

## Item 6 — Varredura global "Ajustes" / aba "Mais"

`rg "Ajustes" src/components/onboarding/OnboardingFlow.tsx` hoje retorna 3 ocorrências (linhas 351, 889, 1139). Todas endereçadas pelos itens 1, 4 e 5. Confirmar zero ocorrências após o patch. Confirmar que toda barra de navegação em qualquer passo usa `MoreHorizontal` + "Mais" na última aba.

## Travas e blindagens

- Mocks usam apenas constantes locais. Sem `useData`, sem `useTimer`, sem `supabase` (exceto o `FinalStep` que já usa `useAuth` — mantido).
- Reduced motion: pulso do botão de jornada, contadores animados do Passo 6 e a path animation do gráfico do Passo 4 respeitam `useReducedMotion()`.
- Sem `truncate` / reticências nos textos novos.
- Sem travessões em copy nova (regra do projeto).
- Cores semânticas: azul=bruto, verde=líquido/sucesso, vermelho=gasto, amber=alerta (NÃO usar para custos fixos), neutro/muted=info estrutural.
- Dados de exemplo coerentes com o modelo (bruta = líquida + custos fixos).
- Navegação do tour, "Pular" e "Continuar" não são tocados.

## Bloco opcional (header `/ajustes` → "Mais")

NÃO INCLUÍDO. Se quiser incluir, basta avisar e adiciono `src/pages/Settings.tsx`.

## Validação

- `tsgo --noEmit` limpo.
- Rodar o tour do começo ao fim: nenhum "Ajustes" sobra, todas as barras de navegação mostram "Mais" com `•••`, mocks batem visualmente com Home/EntryDrawer/JourneyModule/Reports/PainelResumo reais, animações funcionam, `Pular`/progresso continuam.
- Testar com `prefers-reduced-motion`: pulso do botão de jornada, gráfico de Relatórios e contadores do Passo 6 ficam estáticos.

## Arquivos alterados

- `src/components/onboarding/OnboardingFlow.tsx` (único arquivo).
