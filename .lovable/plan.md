# Sprint — Tour: fix "Próximo" + destaque 3-modos + reset limpo

Ordem: A → D → C → B. Partes A/C/D iguais ao plano anterior; parte B substituída pelo adendo (3 modos de destaque).

## A. Destravar "Próximo" dentro do drawer

**`src/components/EntryDrawer.tsx`** — no `<Drawer>` (~linha 421), adicionar `modal={false}`:

```tsx
<Drawer open={open} onOpenChange={...} dismissible={false} repositionInputs={false} modal={false}>
```

Focus trap do Vaul engolia cliques no balão (que vive em portal fora do drawer). `dismissible={false}` mantém não-fechar-clicando-fora; `DrawerOverlay` renderiza independente de `modal`, então backdrop escuro do drawer segue igual.

## D. Remover "Voltar" do balão

**`src/components/tour/TourOverlay.tsx`**: remover o bloco `{currentStepIndex > 0 && <button>Voltar</button>}` e o uso de `prev`. Balão passa a ter:
- `advance:"next"` → "Pular" + "Próximo/Concluir"
- `advance:"action"` → só "Pular"

**`src/context/TourContext.tsx`**: manter `prev` no value (não é chamado, menor diff).

## C. Reset "Usuário novo" não reativa dialogs antigos

**`src/pages/Settings.tsx`** — no update do botão "Usuário novo (reset)", remover do payload: `car_onboarded`, `goal_onboarded`, `costs_onboarded`, `planning_onboarded`. Manter `onboarded: false` e todas as `fs_*`/`tour_*`. Assim `CarOnboardingDialog`, `VehicleCostsOnboardingDialog` e `PlanningOnboardingDialog` (a serem aposentados na Sprint 4) não reaparecem no teste.

## B. Destaque em 3 modos (spotlight / glow / none)

### B1. Keyframes em `src/index.css` (dentro de `@layer utilities`)

```css
@keyframes tour-glow-pulse {
  0%, 100% { box-shadow: 0 0 0 3px hsl(var(--primary)), 0 0 14px 3px hsl(var(--primary) / 0.5); }
  50%      { box-shadow: 0 0 0 3px hsl(var(--primary)), 0 0 24px 7px hsl(var(--primary) / 0.75); }
}
.tour-glow { animation: tour-glow-pulse 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .tour-glow { animation: none; }
}
```

### B2. `src/components/tour/TourOverlay.tsx` — modo por contexto

Reusar `insideDrawer` e `isLast` que já existem. Adicionar:

```tsx
const mode: "spotlight" | "glow" | "none" =
  isLast ? "none" : insideDrawer ? "glow" : "spotlight";
```

Regras de render (todos os elementos decorativos com `pointer-events-none`; só o `PopoverContent` mantém `pointer-events-auto`):

- **spotlight (Home, não-último)**: renderizar as 4 camadas atuais (`parts`) com `bg-black/70` e `pointer-events-none` (recorte no alvo) + anel `.tour-glow` no rect.
- **glow (dentro do drawer)**: nenhuma camada escura (backdrop do drawer já dimma) + só anel `.tour-glow` no rect.
- **none (passo de conclusão / `isLast`)**: nenhuma camada, nenhum glow. Balão renderizado sem `PopoverAnchor` no rect, centralizado na viewport (por exemplo via um anchor fixo no centro: `left: 50vw, top: 50vh, width:0, height:0`).

Remover o fallback antigo "sem rect → tela toda preta". Se `rect` está ausente e mode ≠ none, mostrar só o balão (sem glow, sem escurecimento).

Manter o balão (Popover/PopoverContent) igual — inclusive prevenções (`onPointerDownOutside`, `onEscapeKeyDown`) e `z-[9999]`.

### B3. Consequência positiva

Em nenhum modo há camada bloqueante sobre o alvo → toque no +, no "Novo ganho", nos campos do drawer e no Salvar chega ao elemento diretamente. Elimina de vez o histórico de "camada bloqueia clique". `insideDrawer` deixa de ser gambiarra e passa a ser sinal legítimo de modo.

## Validação

1. Passo "toca no +": Home escurece forte, + aceso com glow, clicável.
2. Passo "escolhe Novo ganho": menu radial aceso, resto escuro, botão clicável.
3. Passo "quanto recebeu" (drawer): SEM escurecer, campo com glow, "Próximo" clica e avança.
4. Passo "Salvar" (drawer): só glow no Salvar, clicável.
5. Passo "Prontinho!": só balão centralizado, sem glow nem escurecimento.
6. Balão sem "Voltar" em nenhum passo.
7. Reset "Usuário novo": não abre "Cadastre seu carro" nem "Planejamento Inteligente".
8. `prefers-reduced-motion`: glow parado.
9. Drawer segue com backdrop escuro atrás mesmo com `modal={false}`.

## Arquivos tocados

- `src/components/EntryDrawer.tsx` — prop `modal={false}`
- `src/components/tour/TourOverlay.tsx` — remover Voltar, aplicar 3 modos
- `src/pages/Settings.tsx` — payload do reset
- `src/index.css` — keyframes `tour-glow-pulse`
