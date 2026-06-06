## 1) Home — rodapé do card R$/km centralizado

No `src/pages/Dashboard.tsx` (bloco do KM Inteligente, ~linhas 480–492), o rodapé hoje usa `flex justify-between` com um divisor vertical no meio (Alvo à esquerda, KM restantes à direita).

Vou alinhar visualmente ao card principal (Líquido/Bruto do print 2):
- Trocar o layout para **uma linha centralizada**, com “Alvo R$ … • 3.750 km restantes” usando um separador discreto (bullet `•` ou pequeno divisor) — exatamente o mesmo padrão de “Bruto R$ … | Gastos R$ …”.
- Pequeno respiro entre a linha divisória do card e o texto (aumentar `py` do bloco de `py-1.5` para `py-2`).
- Manter a tipografia atual (mesmo tamanho, mesma cor sóbria) e o destaque de cor apenas no “restantes” quando fora do ritmo.

## 2) Jornada na Home — cor e sugestão inteligente

Causa: `src/components/JourneyModule.tsx` ainda lê `settings.goalType` para definir a cor e para calcular a sugestão diária. A Home migrou para o seletor Líquido/Bruto via `useHeroMetric()` (localStorage `volant.heroMetric.v1`), então o `settings.goalType` ficou estagnado — por isso a cor parou de responder e a sugestão sumiu/ficou errada.

Correção mínima no `JourneyModule.tsx`:
- Importar `useHeroMetric` e derivar `isGross = heroView === "gross"` (em vez de `settings.goalType`).
- Para a **sugestão inteligente de meta diária**, usar o mesmo snapshot do Planejamento Inteligente que a Home já usa (`usePlanningSnapshot()` de `@/lib/planningEngine`): pegar a meta diária correspondente ao modo atual (bruto/líquido). Fallback para `deriveGoals(settings.monthlyGoal, …)` apenas quando o planejamento não estiver configurado, agora passando `goalType` derivado do `heroView`.
- O texto “Sugestão inteligente: R$ X” volta a aparecer sempre que houver meta válida.

Nada muda na lógica do timer, das pausas, do encerramento ou do drawer de lançamento.

## 3) Ajustes → Central de Veículos → Custos — atalho para cadastrar carro

Hoje o estado vazio (`src/components/vehicle/VehicleCostsCard.tsx`, linhas 84–95) só orienta por texto. Vou:
- Adicionar um botão primário **“Cadastrar carro”** logo abaixo da mensagem, navegando para `/ajustes/veiculos/carros` com `state: { returnTo: "/ajustes/veiculos/custos" }`.
- A página `MeusCarros` já trata `returnTo` no `CarFormDialog.onSaved` (linhas 133–140), então após salvar o usuário volta automaticamente para a tela de Custos — e não para a lista de veículos cadastrados.
- Manter o texto explicativo atual logo acima do botão, levemente reduzido para evitar redundância.

## Arquivos alterados
- `src/pages/Dashboard.tsx` — rodapé do card R$/km centralizado.
- `src/components/JourneyModule.tsx` — passa a usar `useHeroMetric` + `usePlanningSnapshot` para cor e sugestão.
- `src/components/vehicle/VehicleCostsCard.tsx` — botão “Cadastrar carro” no estado vazio com `returnTo`.

## Fora de escopo
Sem mudanças em banco, e-mails, planejamento, autenticação ou navegação global.