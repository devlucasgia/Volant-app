## O que vamos resolver

1. A tela de Manutenção Preventiva hoje pede intervalo manualmente, só conhece "óleo" e usa um único KM de última manutenção — duplicando o que já está em **Custos do veículo** (`oil_change_interval_km` e `tires_interval_km`) e ignorando pneus.
2. Não existe forma de corrigir o KM real do carro quando o motorista anda fora do app.
3. O alerta de e-mail dispara cedo demais porque usa o intervalo manual (ex.: 9.500 km) em vez do que está em Custos (ex.: 10.000 km de óleo / 50.000 km de pneus).
4. As notificações na **central (sino)** não existem para manutenção.
5. O carro ativo aparece sem destaque na tela.

---

## 1. Tela "Manutenção Preventiva" — nova lógica

A tela deixa de cadastrar intervalo e passa a **só acompanhar** o que veio dos Custos.

**Removido da tela:**
- Campo "Intervalo (km)" (usa `oil_change_interval_km` / `tires_interval_km` do carro ativo).
- Campo único "Última manutenção feita em (km)" (substituído pelo registro por tipo).
- Os campos `maintenance_interval_km` e `last_maintenance_km` em `user_settings` deixam de ser lidos/escritos pela tela (mantidos no schema para não quebrar dados antigos; código que ainda lê — Dashboard banner e Settings draft — passa a usar a nova fonte).

**Novo layout da tela:**

```text
┌─ Carro ativo: [card destacado com brand/model + badge ATIVO]
│
├─ Bloco "Troca de óleo"
│    Intervalo: 10.000 km (vindo de Custos)  [Editar nos Custos →]
│    Última troca: 60.700 km    [Atualizar última troca]
│    KM atual: 62.524 km
│    Próxima troca aos 70.700 km — Faltam 8.176 km
│    [barra de progresso verde/amarelo/vermelho]
│
├─ Bloco "Troca de pneus" (mesma estrutura, usando tires_interval_km)
│
├─ Bloco "Ajuste manual do KM do carro"
│    Campo vazio + botão "Aplicar ajuste"
│    Microcopy: "Rodou fora do app? Informe o KM real e o Volant
│    corrige o acompanhamento sem mexer no seu histórico."
│
└─ Bloco "Como funciona" (mantido)
```

Sem o botão "Salvar" no rodapé — cada bloco salva sob demanda.

**Estados especiais:**
- Sem `oil_change_interval_km` / `tires_interval_km` em Custos → mostra o bloco em estado vazio com CTA "Definir intervalo nos Custos" → navega para `/ajustes/veiculos/custos`.
- Sem nenhum intervalo definido → toda a tela mostra empty state pedindo cadastro nos Custos.

---

## 2. Registrar "última manutenção" por tipo (óleo / pneus)

Dois caminhos, ambos gravando o mesmo dado:

### Caminho A — botão direto na tela
Cada bloco (óleo/pneus) tem o botão **"Atualizar última troca"** que abre um sheet:
- Tipo (pré-selecionado pelo bloco): Óleo ou Pneus
- KM em que foi feita: NumberField (default = KM atual do carro)
- Data (default = hoje)
- Botão Salvar

Ao salvar: cria uma `entries` (`type='expense'`, `expense_category='manutencao'`, `maintenance_type` = `oleo` | `pneus`, `expense_amount = 0`, `entry_date`). É a mesma estrutura que `check-maintenance-alerts` já lê para calcular `kmSinceLast`, então não quebra nada e o histórico passa a refletir.

### Caminho B — pelo lançamento de gasto natural (FAB "+")
Em `EntryDrawer`, quando o usuário salva um gasto com categoria "Manutenção" e `maintenance_type ∈ {oleo, pneus}`, mostramos um toast com ação **"Atualizar km da manutenção"** (3-4 s) que leva a `/ajustes/veiculos/manutencao#bloco-{tipo}` já com o sheet de "Atualizar última troca" aberto, pré-preenchido com o KM atual e a data do lançamento. Sem redirecionamento forçado — o motorista decide.

---

## 3. Ajuste manual do KM do carro

Como você escolheu "ajuste interno" (offset), preservando todo o histórico:

- Nova coluna `cars.km_adjustment numeric NOT NULL DEFAULT 0`.
- Helper único `realCurrentKm(car, entries) = initial_km + sum(entries.km do tipo earning) + km_adjustment`.
- Tela pede `kmDesejado`. Cálculo: `novoOffset = kmDesejado − (initial_km + sumEntries)`. Se igual ao atual, não salva nada.
- Após salvar: toast "KM atualizado para X.XXX km", input volta vazio/clicável.
- Refatorar todos os locais que hoje fazem `initial_km + totalKmAllTime(entries)` para usar o helper:
  - `src/pages/Dashboard.tsx`
  - `src/pages/ManutencaoPreventiva.tsx`
  - `supabase/functions/check-maintenance-alerts/index.ts`
  - `src/pages/MeusCarros.tsx` (se exibir KM)
- Os relatórios e estatísticas de "km rodados no período" continuam usando só `entries.km` — não são afetados.

---

## 4. Carro ativo com destaque

Adicionar um header-card no topo da tela e em Planejamento (já tem padrão similar): borda primária, ring sutil, ícone do carro, brand/model em destaque, badge "ATIVO" verde. Componente reutilizado entre as duas telas.

---

## 5. Gatilhos de notificação (Home, central, e-mail)

### Fonte única para todos os canais
Calcular, por carro ativo e por tipo (óleo/pneus):

```text
intervaloKm  = car.oil_change_interval_km  (ou tires_interval_km)
ultimaKm     = última entry com maintenance_type = tipo
             → se não houver, usa car.initial_km
kmAtual      = realCurrentKm(car, entries)        // já inclui ajuste manual
kmRodados    = kmAtual − ultimaKm
kmRestantes  = intervaloKm − kmRodados
proximaKm    = ultimaKm + intervaloKm
```

**Janela de alerta:** `kmRestantes ≤ 500` (ou atrasado, `kmRestantes < 0`).
Antes, a edge function disparava quando `kmSinceLast ≥ intervalo − 500` mas usava `intervalo` = 9.500 (manual). Com a correção, no exemplo do print: óleo 10.000, última 60.700 → próxima 70.700, atual 62.524 → faltam 8.176 km → **não dispara** (correto).

### Canal 1 — Banner na Home
`Dashboard.tsx` passa a iterar por tipo (óleo + pneus) usando a mesma fonte. Hoje só mostra um banner; vai mostrar até dois (priorizando o mais próximo/atrasado).

### Canal 2 — Central de notificações (sino)
- Novo tipo de notificação em `src/lib/notifications.ts`: `MAINTENANCE_NOTIFICATION_ID_PREFIX = "maintenance_"`.
- Hook `useNotifications` já injeta entradas baseadas em condições do app — adicionar derivação: se algum tipo está em janela, garante notificação `maintenance_{tipo}_{milestoneKm}` na central (dedup por ID; se o usuário descartar, fica no `dismissedIds`).
- Categoria `veiculo`, ícone `vehicle-costs`, CTA "Ver manutenção" → `/ajustes/veiculos/manutencao`.

### Canal 3 — E-mail (edge `check-maintenance-alerts`)
- Reescrever para usar `car.oil_change_interval_km` / `tires_interval_km` (já lê) e `kmAtual` com offset.
- Manter dedupe por `maintenance_alerts_sent (user_id, car_id, alert_type, milestone_km)`.
- Manter idempotencyKey `maint-{carId}-{tipo}-{milestoneKm}`.
- O cálculo de `milestone` passa a ser `ultimaKm + intervaloKm` (não mais `floor(kmSinceLast/intervalo)*intervalo + intervalo`).

### Resumo dos gatilhos
| Canal | Quem dispara | Quando |
|---|---|---|
| Home (banner) | Render do Dashboard | Sempre que `kmRestantes ≤ 500` em qualquer tipo |
| Central (sino) | `useNotifications` deriva ao montar | Mesma condição; persistido no localStorage do usuário |
| E-mail | Cron diário em `check-maintenance-alerts` | Mesma condição; uma vez por milestone |

---

## 6. Mudanças por arquivo

### Migration (schema)
- `ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS km_adjustment numeric NOT NULL DEFAULT 0;`

### Frontend
- `src/types/index.ts` — adicionar `km_adjustment` em `Car`.
- `src/lib/carKm.ts` *(novo)* — helper `realCurrentKm(car, entries)`.
- `src/pages/ManutencaoPreventiva.tsx` — reescrita conforme seções 1–4.
- `src/components/vehicle/ActiveCarHeader.tsx` *(novo)* — card destacado reutilizável.
- `src/components/vehicle/UpdateLastMaintenanceSheet.tsx` *(novo)* — sheet usado pelos blocos óleo/pneus.
- `src/components/EntryDrawer.tsx` — após salvar gasto manutenção óleo/pneus, mostrar toast com ação.
- `src/pages/Dashboard.tsx` — banner por tipo, usando nova fonte.
- `src/lib/notifications.ts` + `src/hooks/useNotifications.ts` — derivação da notificação de manutenção na central.
- `src/context/DataContext.tsx` — expor `km_adjustment` e `updateCarKmAdjustment`.

### Backend
- `supabase/functions/check-maintenance-alerts/index.ts` — usar offset e milestone correto.

---

## 7. Verificação de regressão (o que NÃO quebrar)

- `user_settings.maintenance_interval_km` / `last_maintenance_km` continuam no schema; só a tela e o banner deixam de lê-los. `Settings.tsx` mantém o draft e qualquer dado antigo persiste — sem perda.
- `Dashboard.tsx` linha 243-248 (banner antigo) será trocado, mas o `entries`/`carInitialKm` continuam vindo do mesmo lugar.
- `totalKmAllTime(entries)` permanece intacto — só somamos o offset por cima onde precisamos do "KM real do carro".
- `check-maintenance-alerts` continua deduplicado por `maintenance_alerts_sent` — milestones já enviados não disparam de novo.
- Relatórios de KM por período não usam KM do carro; usam `entries.km` direto.
- RLS: nenhuma tabela nova; a coluna nova herda a policy de `cars` (owner-only).

---

## 8. Validação ao final

1. Cadastrar intervalo 10.000 (óleo) e 50.000 (pneus) em Custos.
2. Sem registro de "última troca" → próxima óleo = `initial_km + 10.000`, próxima pneus = `initial_km + 50.000`.
3. Registrar última troca de óleo em 60.700 (via tela) → próxima vira 70.700; banner some no exemplo do print.
4. Aplicar ajuste manual: digitar `80.000` → `km_adjustment` ajustado; "Faltam" recalcula; campo volta vazio.
5. Lançar gasto manutenção/óleo via FAB → toast com ação aparece; ao clicar, sheet abre pré-preenchido.
6. Rodar `check-maintenance-alerts` manualmente: confirmar que só dispara quando `kmRestantes ≤ 500` e que insere em `maintenance_alerts_sent`.
7. Verificar central de notificações: notificação aparece quando alerta ativo, some quando atualizo a última troca, fica dismissed se eu limpar.
