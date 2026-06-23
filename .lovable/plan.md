## Sprint E — GuidedFlow premium + correções PainelResumo

Escopo restrito a 2 arquivos. Sem mudanças em lógica de dados, queries, engine ou outros componentes.

### Arquivo 1 — `src/components/planejamento/PainelResumo.tsx`

**1a — Badge "Refeito" sem quebrar linha**
Substituir o wrapper do header do card "Plano de {mes}" por versão com `flex-wrap`, `whitespace-nowrap` no label e `flex-shrink-0` no badge (badge fica menor: `text-[8px]`, `py-px`).

**1b — Card "Até agora"**
Verificar/garantir classes já presentes:
- `Já fiz` → `text-primary font-bold text-[15px]` ✓ (já está)
- `Dias rodados` / `KM rodado` → `text-foreground font-semibold` ✓ (já está)
- `R$/km atual` → `rpkColor` dinâmico ✓ (já está)

Apenas confirmar — sem mudanças se já estiverem corretas.

### Arquivo 2 — `src/components/planejamento/GuidedFlow.tsx`

**2 — Wrapper de conteúdo dos steps**
Trocar `justify-center ... py-3` por `justify-start pt-6 pb-20` no container que envolve os steps, para o conteúdo começar mais alto.

**3 — Step2 (Meta)**
- `StepHeader.subtitle`: trocar para texto humano dependente de `isLiquido` ("Quanto você quer tirar de salário…" vs "Quanto você quer faturar no total…").
- Remover `<p>` do exemplo "Exemplo: 4.000…".
- Adicionar micro-label verde abaixo do input confirmando o valor digitado em `fmtBRL`.

**4 — Step3 (Dias)**
Adicionar bloco informativo (card sutil `border-border/40 bg-muted/20`) entre os atalhos e o contador, explicando que dias não marcados são folga.

**5 — Step4 (KM)**
- Separar linha do R$/km mínimo como número principal (border-top, label uppercase, valor `text-[18px] font-bold` com cor semântica: rose >5, amber >3.5, primary caso contrário).
- Faturamento necessário em `text-blue-400` (bruto).
- Remover parágrafo "Com o tempo, seus registros…".

**6 — Step6 (Resumo) — reformulação completa**
Substituir o componente inteiro por uma versão que mostra:
- Herói "Objetivos do dia" idêntico ao PainelResumo (Meta diária + R$/km mínimo com gradient white→emerald).
- Alerta de viabilidade (amber se >3.5, rose se >5) com os mesmos textos da Mudança D.2 v2.
- Card "Composição do plano": Faturamento bruto (azul), Custos do carro (rose, com sinal −), Lucro líquido/Meta (emerald em destaque), Combustível estimado (referência, muted).

Manter assinatura props existentes (`draft`, `plan`, `costsItems`, `variableItems`, `variableTotal`, `fixedTotal`).

**7 — Botão final**
Trocar `"Concluir planejamento"` por `"Começar com esse plano"` (preserva `"Salvar alteração"` em modo edit).

### Não alterar

`finish()`, `canNext`, `back`, persistência de rascunho, Step1, Step5, CalendarGrid, estrutura do `StepHeader`, planningEngine, smartKm, Dashboard, DataContext, AuthContext, queries, painel admin.

### Validação

Build TS limpo; visual conforme brief; nenhum efeito colateral em dados/lógica.
