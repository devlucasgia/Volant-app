## Parte 1 — Refino do seletor Líquido/Bruto na Home (`src/pages/Dashboard.tsx`)

Mudanças visuais no card hero, sem alterar nenhuma lógica de cálculo:

- **Seletor minimalista**: substituir o `Segmented` atual (visualmente forte, verde sólido) por um controle pill discreto, inline com o título, altura ~24–26px, fundo `bg-white/5`, borda `border-white/10`, knob ativo apenas com leve tinta verde/azul (de acordo com o modo) + texto branco. Largura ~118–128px. Pode ficar como variante `size="xs"` do `Segmented` ou um pequeno componente local; manter API/value/onChange iguais para preservar a sincronização com `settings.goalType`.
- **Hierarquia do card**: título e subtítulo recuam (subtítulo `text-[10px]`/`tracking-[0.1em]`/opacidade ~60%); valor principal continua dominante.
- **Card clicável como atalho**: o próprio card (área livre, fora do segmented e do botão de olho) alterna entre Líquido/Bruto via `onClick` no wrapper, com `aria-pressed`, feedback `active:scale-[0.995]` e cursor pointer. O segmented continua sendo a indicação primária — sem ambiguidade com o botão de ocultar valores.
- **Animação da troca** (sem novas libs):
  - Valor principal: pequeno count-up (~350ms, ease-out) já que `key={heroMetric}` força remontagem; criar um hook leve `useCountUp(value, 350ms)` reutilizável também pelo card de meta e KM Inteligente. Respeita `prefers-reduced-motion` (salta direto ao valor final).
  - Cores: garantir `transition-colors duration-500` nos elementos que trocam (borda, gradiente, divisores, dots).
  - Barra de meta: já anima largura — aumentar `transition-[width] duration-700 ease-out`.
- **Elementos da Home que acompanham o modo** (apenas reflexo visual, lógica intacta):
  - Seletor de período (chip ativo): trocar o token de cor ativa entre `success` e `goal-gross` conforme `settings.goalType`.
  - Botão "Iniciar jornada" (`JourneyModule`): aplicar a mesma cor contextual (gradiente/glow).
  - Card de meta e R$/KM Inteligente: já reagem; apenas suavizar transição.
  - **NÃO trocar**: FAB central, BottomNav, logo, gastos (vermelho), Premium (dourado), demais rotas.
- **Responsividade**: validar em 360/390/430/tablet/desktop. Em 360px, segmented quebra para abaixo do título se necessário (`flex-wrap` no header do card), preservando o valor principal sem compressão.

## Parte 2 — Correção do dark mode padrão

Causa raiz provável: o `DataContext` aplica `document.documentElement.classList.toggle("dark", ...)` apenas **depois** do React montar e do `settings` carregar. No primeiro paint do `/app`, o `<html>` ainda não tem `class="dark"`, então usuários novos veem white por uma janela curta — e em alguns casos (login direto, navegação SPA da landing para `/app`) o flash fica visível e dá a sensação de "modo claro ativo".

Correção mínima:
- **Script inline em `index.html`** (antes do bundle): lê `localStorage` (chave que o app já usa para tema persistido, ou cai no default `dark`) e aplica `document.documentElement.classList.add("dark")` sincronamente. Se a única fonte de verdade do tema for `user_settings` no banco, o default no inline script continua sendo `dark` — alinhado ao default `"dark"` em `DataContext` (linha 52) e ao fallback de leitura (linha 177).
- **Persistência local do tema** em `DataContext.updateSettings`: ao alterar `theme`, gravar também em `localStorage` (`volant.theme`) para o script inline ter o que ler na próxima visita. Leitura do servidor continua sobrescrevendo se houver preferência salva no Supabase (mantém a fonte de verdade).
- **Não tocar** na landing `/` (Landing já tem seu próprio fundo controlado). O script inline só adiciona a classe `dark`, e a Landing pública já é estilizada com cores explícitas, sem depender de `.dark` para legibilidade — verificar rapidamente antes de aplicar; se houver risco, restringir o inline a "se rota começar com /app, /auth, /checkout".

Resultado esperado: novo usuário entra em dark; quem escolheu light continua em light; flag em Aparência sempre reflete o tema real; sem flash branco.

## Parte 3 — Cards Bruto e Gastos lado a lado em Relatórios (`src/pages/Reports.tsx` + `src/lib/reportOrder.ts`)

Causa: hoje `gross` e `expenses` são itens independentes da lista `reportOrder` e o renderer principal usa `space-y-3` (empilhamento vertical), então cada um vira card de largura cheia.

Correção:
- Fundir em um único bloco `grossExpenses` na ordem:
  - `src/lib/reportOrder.ts`: substituir `"gross"` e `"expenses"` por uma chave única `"grossExpenses"`; migrar pedidos salvos (filtro existente já descarta chaves desconhecidas, e o append garante o novo item). Atualizar `DEFAULT_REPORT_ORDER`.
  - `src/lib/reportWidgets.ts`: idem para a visibilidade — uma única toggle "Bruto e Gastos" (ou manter dois toggles, mas renderizar juntos quando ambos ativos). Mais simples: um único widget combinado.
- `src/pages/Reports.tsx`: renderer `grossExpenses` retorna `<div className="grid grid-cols-2 gap-3">` com os dois `SideStatCard` (Bruto info/azul + Gastos destructive/vermelho) — exatamente o layout anterior. Quando apenas um estiver visível, ocupa grid-cols-1.
- Tela de personalização da ordem (Organização de Cards de Relatórios) passa a mostrar "Bruto e Gastos" como item único — aceitável conforme o brief.

## Parte 4 — Restaurar exportação Excel/Word em Relatórios

Investigação: o arquivo já contém `exportCSV()` (linha 147) e `exportPDF()` (linha 166) totalmente implementados via `jsPDF`/`autoTable`, mas **não há botão na UI** que os invoque (eles ficaram órfãos após alguma refatoração). Não há lógica antiga de `.xlsx` ou `.docx`.

Plano:
- Adicionar no header de Relatórios (perto do filtro de período) um botão "Exportar" → `DropdownMenu` com 4 itens reutilizando o que já existe + adicionando wrappers leves para Excel/Word:
  - **Excel (.xlsx)**: instalar `xlsx` (SheetJS) e gerar planilha com duas abas — "Resumo" (mesmos indicadores do PDF) e "Lançamentos" (mesma estrutura do CSV). Função `exportXLSX()` ao lado de `exportCSV`.
  - **Word (.docx)**: instalar `docx` e gerar um documento simples com título, período, tabela de indicadores e tabela de lançamentos. Função `exportDOCX()`.
  - **PDF**: usar o `exportPDF()` existente.
  - **CSV**: usar o `exportCSV()` existente.
- A exportação respeita `filtered` e `periodLabel`, que já consideram o filtro atual.
- Sem alterar estrutura de dados nem cálculos.

## Arquivos alterados/criados

Alterados:
- `src/pages/Dashboard.tsx` — refino do seletor, card clicável, animações, propagação contextual de cor para período/jornada.
- `src/components/Segmented.tsx` — adicionar variante `size="xs"` minimal (ou aceitar `tone="contextual"` para verde/azul); mudanças retrocompatíveis.
- `src/components/JourneyModule.tsx` — receber/derivar cor contextual a partir de `settings.goalType`.
- `src/context/DataContext.tsx` — persistir tema em `localStorage` quando alterado.
- `index.html` — script inline curto aplicando `dark` antes do paint.
- `src/pages/Reports.tsx` — bloco `grossExpenses` lado a lado, header com botão Exportar (dropdown) chamando as 4 funções.
- `src/lib/reportOrder.ts` e `src/lib/reportWidgets.ts` — substituir `gross`+`expenses` por `grossExpenses`.

Criados:
- `src/hooks/useCountUp.ts` — hook de count-up curto (~350ms, respeita reduced-motion).
- (sem novos componentes para exportação — funções locais no `Reports.tsx`).

Dependências novas:
- `xlsx` (SheetJS) — leve, padrão de mercado.
- `docx` — geração de .docx no client.

## Garantias de escopo (não tocar)

- Stripe, `supabase/functions/*`, `CheckoutReturn.tsx`, webhooks, `subscriptions`.
- Schema Supabase (sem migrations); apenas leitura/escrita já existentes em `user_settings`.
- `AuthContext`, `RequireAuth`, `RequirePremium`, `useSubscription`, lógica Premium.
- Onboarding (`OnboardingFlow`, `CarOnboardingDialog`, `MonthlyGoalOnboardingDialog`).
- Fluxo PWA (`InstallPromptManager` etc.).
- Landing pública `/` (`src/pages/Landing.tsx`) e `/auth`.
- Central de Notificações (sem mudanças).
- Lógica matemática de KM Inteligente, metas, R$/h, R$/km — preservada; apenas espelha visualmente o modo ativo.

## Critérios de validação que serão checados após implementar

- Home: seletor discreto, card forte e clicável, troca animada e fluida, período e botão "Iniciar jornada" acompanham cor contextual, FAB/logo/nav inalterados, mobile 360–430 sem overflow.
- Tema: usuário novo entra em dark sem flash; flag bate com a UI; alternar em Aparência troca imediatamente e persiste.
- Relatórios: Bruto e Gastos lado a lado, identidades azul/vermelha preservadas, personalização de ordem funciona com o novo bloco combinado.
- Exportação: dropdown com CSV, Excel, Word, PDF, todos respeitando o período atual.

Aguardo seu OK para executar.