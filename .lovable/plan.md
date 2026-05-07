## Plano de implementação

### 1. Múltiplos carros + seleção
**DB:** Nova tabela `cars` (user_id, brand, model, plate, initial_km, is_active, created_at). Migrar dados atuais de `profiles.car_*` para a nova tabela (1 carro por usuário existente, marcado como ativo). Manter `car_onboarded` em `profiles`. RLS por owner.

**UI (Ajustes → Meus carros):**
- Lista de carros cadastrados como cards, cada um com selo "Ativo" (radio para selecionar), botões editar/excluir.
- Botão "Adicionar carro" abre dialog com os campos atuais.
- Edição abre o mesmo dialog pré-preenchido.
- Exclusão pede confirmação. Se excluir o ativo, ativa outro automaticamente (ou nenhum).

**Lógica:** `DataContext` passa a expor `cars`, `activeCar`, `carInitialKm` derivado do carro ativo. Manutenção preventiva usa o carro ativo.

### 2. Nova tela "Jornada" (controle de tempo rodando)
- Rota nova `/jornada` posicionada **antes** de Ajustes na bottom nav.
- Ícone: `Timer` (lucide).
- Tela com:
  - Timer grande HH:MM:SS
  - Estado: parado / rodando / em descanso
  - Botões: Iniciar, Pausar (descanso), Retomar, Zerar
  - Cards de resumo: tempo trabalhado, tempo em descanso
- **Estado global** em novo `TimerContext` (persistido em `localStorage` para sobreviver a reloads, contando tempo via `startedAt` timestamp para precisão mesmo com app fechado).
- **FAB flutuante** visível em todas as telas (exceto na própria `/jornada`) quando timer está ativo: mostra HH:MM:SS atualizando, ao clicar navega para `/jornada`. Posicionado para não conflitar com o FAB de novo registro existente (acima dele, à esquerda, ou no topo).

### 3. Bug: salvar ganho + gasto juntos
No `EntryDrawer`, atualmente o submit aparentemente trata como exclusivo. Ajustar para criar **dois entries** (um earning, um expense) na mesma submissão quando ambas as seções estiverem preenchidas. Validar separadamente.

### 4. Dashboard "Por gastos" com emojis
Em `EXPENSE_META`, adicionar campo `emoji` (🍔, ⛽, 🔧, 📦). No componente da seção "Por gastos" no Dashboard, substituir o ícone Lucide pelo emoji (mantém cor do gráfico).

### Arquivos a alterar/criar
- Migration: cria `cars`, copia dados de `profiles`
- `src/context/DataContext.tsx` — gerenciar carros e ativo
- `src/context/TimerContext.tsx` (novo)
- `src/pages/Journey.tsx` (novo) — tela do timer
- `src/components/TimerFab.tsx` (novo) — FAB global
- `src/components/CarOnboardingDialog.tsx` — usar nova tabela
- `src/components/CarFormDialog.tsx` (novo) — adicionar/editar carro
- `src/pages/Settings.tsx` — UI de múltiplos carros
- `src/pages/Dashboard.tsx` — emojis na seção por gastos
- `src/components/EntryDrawer.tsx` — salvar 2 entries
- `src/components/BottomNav.tsx` + `App.tsx` — nova rota
- `src/components/AppLayout.tsx` — montar TimerFab
- `src/types/index.ts` — adicionar emoji em EXPENSE_META, tipo Car

Confirma para eu seguir?
