
# Onboarding: planejamento unificado + novo fluxo inicial

Dois ajustes ligados ao planejamento inteligente:

## 1. Onboarding animado — unificar "Metas" e "KM Inteligente"

Hoje o tour de boas-vindas (`src/components/onboarding/OnboardingFlow.tsx`) tem duas telas que viraram redundantes:

- `metas` — Meta mensal com progresso animado
- `kmInteligente` — R$/km inteligente derivado

Como o app agora trata tudo dentro de **Planejamento Inteligente**, vou substituir as duas telas por **uma única tela** chamada `planejamento`, baseada visualmente na tela real (`PainelResumo` + cards do `PlanejamentoInteligente.tsx`).

Mudanças no `OnboardingFlow.tsx`:

- `StepKey` e `STEPS`: remover `"metas"` e `"kmInteligente"`, adicionar `"planejamento"`. Nova ordem: `welcome → registro → jornada → relatorios → customizacao → planejamento → final`.
- Apagar os componentes `MetasStep` e `KmInteligenteStep` e criar um novo `PlanejamentoStep` que mostra, dentro do `PhoneFrame`, uma maquete do painel real com:
  - Header "Planejamento Inteligente" com ícone `Brain`.
  - Card de **Meta mensal** com barra de progresso animada (count-up dos ganhos).
  - Card de **R$/km inteligente** com valor calculado e legenda "sugerido para fechar o mês".
  - Mini-cards de **Dias planejados** e **KM previsto** (espelhando o painel real).
  - Sequência animada: meta aparece → custos do veículo entram → dias planejados → resultado R$/km destaca-se.
- Eyebrow: "Planejamento Inteligente" • Título: "Sua meta e o R$/km ideal num só lugar" • Descrição curta explicando que meta e KM agora trabalham juntos.
- Rodapé com 2–3 `HighlightRow`s combinando os pontos antigos (meta evolui sozinha; sugere R$/km estratégico; ajustável em **Ajustes → Planejamento Inteligente**).

Nada muda no fluxo de finalização (`onboarded=true` ao concluir/pular).

## 2. Cadastros pós-onboarding — nova ordem

Hoje, após o tour:
1. `CarOnboardingDialog` (carro)
2. `MonthlyGoalOnboardingDialog` (meta antiga — não faz mais sentido)

Nova sequência desejada:
1. **Cadastro do veículo** — mantém `CarOnboardingDialog`
2. **Custos do veículo** — novo passo
3. **Perguntas iniciais do Planejamento Inteligente** — usar o `GuidedFlow` real

Todos opcionais, com botão **Pular** visível e mensagem indicando onde concluir depois.

### 2.1. `CarOnboardingDialog.tsx`
- Adicionar texto auxiliar no rodapé/descrição: "Você pode cadastrar depois em **Ajustes → Meus carros**."
- Manter botões **Pular** / **Salvar** já existentes.
- Ao terminar (salvar ou pular), continuar disparando `volant:car-onboarding-finished` (já existe). O próximo dialog escuta esse evento.

### 2.2. Novo `VehicleCostsOnboardingDialog.tsx`
- Criar em `src/components/VehicleCostsOnboardingDialog.tsx`.
- Reusa `VehicleCostsSection` (já existe em `src/components/vehicle/VehicleCostsSection.tsx`).
- Abre quando recebe `volant:car-onboarding-finished` **e** o perfil ainda não tem `costs_onboarded=true`.
- Se o usuário pulou o cadastro de carro (não tem `cars`), o dialog se auto-pula e dispara o próximo evento.
- Se existe carro: aplica os custos no carro ativo (`supabase.from('cars').update(costs).eq('id', activeCar.id)`), e salva `profiles.costs_onboarded = true`.
- Mensagem auxiliar: "Você pode preencher depois em **Ajustes → Veículos → Custos do veículo**."
- Botões **Pular** / **Salvar**.
- Ao fechar, dispara novo evento `volant:costs-onboarding-finished`.

### 2.3. Novo `PlanningOnboardingDialog.tsx` (ou redirect leve)
- Criar em `src/components/PlanningOnboardingDialog.tsx`.
- Escuta `volant:costs-onboarding-finished`. Se `profiles.planning_onboarded` for falso e `settings.planningStatus !== 'configured'`, abre um diálogo curto explicando o Planejamento Inteligente com dois botões:
  - **Configurar agora** → navega para `/ajustes/planejamento` (o `GuidedFlow` real já cobre todas as perguntas).
  - **Agora não** → fecha e marca `planning_onboarded=true`.
- Mensagem auxiliar: "Você pode configurar quando quiser em **Ajustes → Planejamento Inteligente**."
- Por que dialog + redirect em vez de embutir o `GuidedFlow` aqui: o `GuidedFlow` real já é uma tela cheia com `useNavigate`, e duplicá-lo dentro de um modal causaria divergência. O redirect mantém uma única fonte de verdade.

### 2.4. Substituir o `MonthlyGoalOnboardingDialog`
- Remover `<MonthlyGoalOnboardingDialog />` de `src/components/AppLayout.tsx`.
- Adicionar `<VehicleCostsOnboardingDialog />` e `<PlanningOnboardingDialog />` no mesmo layout.
- Manter o arquivo `MonthlyGoalOnboardingDialog.tsx` por enquanto? Não — apagar para evitar dead code, já que o conceito de meta isolada não existe mais.

### 2.5. Schema — flags de onboarding
Adicionar duas colunas booleanas em `profiles` via migração:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS costs_onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS planning_onboarded boolean NOT NULL DEFAULT false;
```

Sem necessidade de novos GRANT/RLS (a tabela já tem políticas de owner).

A coluna antiga `goal_onboarded` deixa de ser usada, mas mantemos no DB para não quebrar usuários existentes.

## Compatibilidade

- Usuários que já passaram pelo onboarding antigo (`onboarded=true`, `car_onboarded=true`, `goal_onboarded=true`) **não** veem os novos dialogs por causa do default `false` das flags novas. Para evitar reabrir o fluxo para eles, os dialogs novos só abrem se `onboarded=true` **e** o usuário acabou de concluir um passo da cadeia (gatilho por evento, não por load). Como o evento `volant:car-onboarding-finished` só dispara após o `CarOnboardingDialog` rodar, usuários antigos nunca verão os novos passos.
- Pequena salvaguarda extra: o `VehicleCostsOnboardingDialog` e o `PlanningOnboardingDialog` ignoram a abertura se `costs_onboarded`/`planning_onboarded` já forem `true`.

## Arquivos afetados

- `src/components/onboarding/OnboardingFlow.tsx` — substitui passos metas/km por `planejamento`.
- `src/components/CarOnboardingDialog.tsx` — adiciona hint de "depois em Ajustes".
- `src/components/VehicleCostsOnboardingDialog.tsx` — novo.
- `src/components/PlanningOnboardingDialog.tsx` — novo.
- `src/components/AppLayout.tsx` — troca `MonthlyGoalOnboardingDialog` pelos dois novos.
- `src/components/MonthlyGoalOnboardingDialog.tsx` — remover.
- Migração SQL adicionando as duas novas flags em `profiles`.
