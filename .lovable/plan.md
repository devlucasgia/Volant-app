# Sprint: Acesso limitado para usuários sem assinatura

## Diagnóstico da causa raiz

O `RequirePremium` atual tem uma lógica **sticky** que é a causa direta do bug reportado:

```ts
setOnboarding((prev) => {
  if (prev === "complete") return "complete"; // <- sticky
  return complete ? "complete" : "incomplete";
});
```

Combinado com:

```ts
if (onboarding === "incomplete") return <>{children}</>; // libera tudo
```

Ou seja: enquanto o onboarding não termina, o app libera **acesso completo** ao conteúdo real (Dashboard, History, Reports, Settings). Como o sinalizador `goal_onboarded` / `car_onboarded` pode ficar incompleto por bugs, race conditions, ou por o usuário fechar diálogos, a conta sem assinatura simplesmente "fica em onboarding eterno" e usa o app inteiro.

Além disso, `RequirePremium` é binário (paywall total vs. acesso total) — não existe modo limitado hoje.

## Nova arquitetura: `useAccessMode`

Hook único, fonte da verdade para gating:

```
type AccessMode = "full" | "limited" | "loading";
```

- `full` — `isActive === true` no `useSubscription` (assinatura ativa, trial, past_due dentro do período, canceled com período futuro, ou `beta_grandfathered`).
- `limited` — qualquer outro caso, **incluindo** erro de carregamento, ausência de dados, `loading` que demorou, ou onboarding incompleto.
- `loading` — apenas enquanto a primeira resolução está em andamento (curto, com timeout → cai pra `limited`).

Exposto via `useAccessMode()` para componentes e via `<RequirePremium>` reescrito.

## Mudanças

### 1) `src/components/RequirePremium.tsx` — reescrita

Substitui o gate fail-closed por:

- Sempre renderiza `{children}` (não bloqueia mais a navegação).
- Disponibiliza `AccessContext` (Provider) com `{ mode, isLimited, isFull, requirePremium() }`.
- `requirePremium(action?: string)`: se `isFull` → retorna `true` e executa; se `isLimited` → abre o `Paywall` como modal e retorna `false`.
- Paywall vira um **modal/sheet** controlado pelo contexto, em vez de tela cheia.
- Mantém o comportamento existente para onboarding: rotas/diálogos de onboarding continuam acessíveis (eles já são modais).

### 2) `src/components/Paywall.tsx` — adaptar para uso modal

- Adiciona prop `asModal?: boolean` e suporte para abrir dentro de um `<Dialog>`.
- Mantém o conteúdo atual; só muda o container.
- Mantém `onSignOut` opcional (não exibe botão de sign-out no modo modal).

### 3) `src/context/AccessContext.tsx` (novo)

Pequeno provider que expõe `mode`, `requirePremium(label?)`, `openPaywall(reason?)`. Throttle interno: não abre o modal mais de uma vez a cada 800ms para evitar spam.

### 4) Pontos de bloqueio (ações operacionais)

Envolver os handlers reais com `requirePremium()`. Lista mínima:

- `EntryDrawer` — onSubmit do lançamento de ganho/gasto.
- `History` — botões de editar/excluir entrada.
- `VehicleCostsCard` — `save()`.
- `Settings` — qualquer ação que altere personalização premium (manter onboarding/perfil/veículo básico liberados).
- `Reports` — overlay discreto na página, conforme item 9.

Onboarding (`CarOnboardingDialog`, `MonthlyGoalOnboardingDialog`, `OnboardingFlow`, `CarFormDialog` no primeiro carro) permanece **liberado**.

### 5) Overlay premium discreto (Reports, History completo)

Componente `<PremiumLockOverlay />`: gradiente escuro suave + cadeado pequeno + "Disponível no Premium" + botão "Desbloquear Premium". Usado em `Reports` e (parcialmente) `History`.

### 6) Home limitada

Dashboard continua renderizando normalmente (já tem empty states bonitos). Não adiciona overlays. As ações (FAB de lançar, etc.) chamam `requirePremium()`.

### 7) Remover sticky onboarding bug

O novo `RequirePremium` não usa mais a flag "sticky". O acesso é determinado **somente** pela assinatura, eliminando a brecha.

## Arquivos afetados

- `src/components/RequirePremium.tsx` (reescrita)
- `src/context/AccessContext.tsx` (novo)
- `src/components/Paywall.tsx` (modo modal)
- `src/components/PremiumLockOverlay.tsx` (novo, pequeno)
- `src/components/EntryDrawer.tsx` (gate no submit)
- `src/components/vehicle/VehicleCostsCard.tsx` (gate no save)
- `src/pages/Reports.tsx` (overlay)
- `src/pages/History.tsx` (gate em editar/excluir)
- `src/App.tsx` (envolver com AccessProvider)

## Não muda

Stripe, webhooks, planos, preços, `useSubscription`, lógica financeira, onboarding visual, Dashboard layout.

## Validação

- Conta sem assinatura: navega Home/Settings/onboarding, mas tentar lançar → modal Premium.
- Conta com `isActive`: tudo normal.
- Erro de rede no `useSubscription` → `isActive=false` (já é fail-closed lá) → modo limitado.
- Reload/troca de aba: `useSubscription` re-valida; não há mais sticky "complete".