
## Item 1 — Tela de Custos em duas abas

### `src/components/vehicle/VehicleCostsSection.tsx`
- Adicionar prop `tab: "fixos" | "variaveis"` (controlada pelo pai) e renderizar apenas os blocos da aba ativa:
  - **Fixos**: Situação do veículo, Óleo, Pneus, Custos fixos.
  - **Variáveis**: Combustível/Energia, Alimentação.
- Remover os dois `<h3>` de seção ("Custos" / "Custos variáveis") — abas cumprem o papel.
- **Fix do aluguel** (estado próprio, sem inferir do valor):
  - Novo `useState<"mensal" | "semanal">` com inicializador derivado: `value.rental_weekly && value.rental_weekly > 0 ? "semanal" : "mensal"` (default mensal quando ambos vazios).
  - `useEffect` que re-deriva `rentalPeriod` sempre que o carro/valor carregado muda (dependência no valor de `rental_weekly`/`rental_monthly` vindos via prop `value`) — evita mostrar o período do carro anterior ao trocar de carro.
  - `Segmented` lê/escreve esse estado. Ao trocar para "mensal" → zera `rental_weekly`; para "semanal" → zera `rental_monthly`.
  - O campo exibido (Aluguel mensal vs Aluguel semanal) passa a depender apenas de `rentalPeriod` (não mais da condição contraditória atual). Com tudo vazio, toggle e campo ficam coerentes.

### Conversão semanal→mensal (confirmada, não altera)
Já existe em `src/lib/planejamento.ts` (linhas 28-32): `rental_monthly` tem prioridade; senão `rental_weekly * 4.33`. Mesma fórmula em `src/lib/smartKm.ts`. Mantenho exatamente como está — nenhuma mudança em arquivos de cálculo.

### `src/components/vehicle/VehicleCostsCard.tsx`
- Adicionar estado `tab` e renderizar `Segmented` (tone="flat", padrão de `OrganizacaoCards`) com Fixos/Variáveis.
- Logo abaixo, card informativo neutro (`bg-muted/50`, `border-border/60`, `rounded-xl`, ícone `Info` em `text-muted-foreground`) com texto contextual por aba; "Planejamento Inteligente" em `font-semibold text-foreground`.
- Manter o select de carro vinculado no topo (acima das abas).
- Remover o botão "Salvar custos" daqui (vai para a página) e expor via props:
  - `onDirtyChange(dirty: boolean)` — notifica o pai.
  - Mecanismo para o pai disparar o save (ex.: `registerSave: (fn: () => Promise<void> | null) => void`) e flag de `saving`.
- Continuar salvando o objeto `costs` inteiro de uma vez.

### `src/pages/CustosVeiculo.tsx`
- Armazenar `dirty`, `saving` e função `save` recebidas do `VehicleCostsCard`.
- Rodapé sticky (`sticky bottom-0 bg-background/90 backdrop-blur` com borda superior e respeito a `safe-area-inset-bottom`) com o botão "Salvar custos" visível em ambas as abas, desabilitado se `!dirty || saving`.
- Interceptar `handleBack`: se `dirty`, abrir `AlertDialog`:
  - Título "Sair sem salvar?"
  - Descrição "Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas."
  - Cancel "Continuar editando" / Action "Sair sem salvar" → executa `handleBack` original.
- Sem alterações → voltar direto. Após save bem-sucedido, `baseline` é atualizado (comportamento já existente), `dirty` volta a `false`.

## Item 2 — Step 3 enxuto (`src/components/planejamento/GuidedFlow.tsx`)

No bloco "Com sua rotina planejada" (linhas ~688-748):
- Remover `<li>` "Faturamento necessário" (706-711).
- Remover `<li>` "R$/KM mínimo necessário" (712-728).
- Remover o bloco de alerta inteiro (735-748).
- Manter "Dias selecionados", "KM planejado no período" e o parágrafo educativo final; ajustar `border-t`/padding do `<p>` para não ficar divisória solta.
- Nenhuma mudança em `plan` ou cálculos; Step 5 inalterado.

## Não altera
`planejamento.ts`, `planningEngine.ts`, `smartKm.ts`, schema do banco, `DataContext`, `AuthContext`, hooks DnD, admin, Home, Relatórios.

## Validação
- Trocar abas mostra blocos corretos; informativo neutro muda texto.
- Aluguel: campos vazios + toggle coerentes; troca efetiva; trocar de carro re-deriva o período corretamente; conversão semanal→mensal (`* 4.33`) preservada.
- Salvar sticky funciona nas duas abas; salva tudo de uma vez.
- Voltar com `dirty` mostra dialog; sem `dirty` sai direto.
- Step 3 mostra só Dias + KM planejado + texto educativo; Step 5 segue com R$/km e faturamento.
- `tsgo --noEmit` limpo.
