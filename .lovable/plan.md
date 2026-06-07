# Manutenção em tempo real + KM planejado atingido na home

## Diagnóstico

### 1. E-mail de manutenção não chega "na hora"

O cron `volant-daily-maintenance-check` roda **1× por dia, às 10:00 UTC (07:00 BRT)**. Confirmei no log:

- Hoje às 10:00 UTC, foram enfileirados e enviados com sucesso **2 e-mails de manutenção para `lucassgprofissional@gmail.com`** (óleo milestone 70.000 e pneus 100.000) — status `sent` em `email_send_log`.
- O teste de "atrasado" da sprint anterior gerou o e-mail, **mas só caiu na caixa de manhã** (provavelmente foi parar em promoções/spam). Não é bug, é só o ciclo diário.
- O teste novo de "próximo" (8.500 km às 11:13 BRT) **não dispara e-mail até amanhã 07:00 BRT**, porque o gatilho é só o cron diário.

→ Precisamos de gatilho **on-demand**, além do cron, sempre que o KM do carro muda.

### 2. Notificação na central não apareceu no teste "próximo"

A central usa `ensureMaintenanceNotifications` (localStorage). Ela é chamada do `Dashboard` quando há alerta. ID é `maintenance_<tipo>_<milestoneKm>`.

Causa provável: o `Dashboard` chama o ensure dentro de um `useEffect` cuja dep é `maintAlerts` — mas o `useNotifications` (que monta a lista da central) **não recebe `maintenanceAlerts` no contexto**, então só refaz a leitura via evento `storage`/custom. Em alguns casos o `write` dispara antes do sheet montar e o estado fica fora de sincronia em navegação rápida. Vou simplificar: o `Dashboard` passa `maintenanceAlerts` para `useNotifications`, igual ao `planning` e `cars`, fechando o caminho do hook.

### 3. Card "KM Inteligente" some quando KM planejado é atingido

No `planningEngine.ts`, quando `remainingPlannedKm <= 0`, `homeSmartRpkGross/Net` retornam 0 → `smartKmValue = null` no `Dashboard` → bloco "smartKm" deixa de renderizar.
A página Planejamento mostra o aviso laranja "Você já usou os KM planejados…", mas a home some com a informação.

---

## Execução

### A) Disparo de e-mail em tempo real

1. **`check-maintenance-alerts` (edge function)** — adicionar suporte a invocação direcionada:
   - Aceitar body `{ user_id }`: quando presente, processar só o(s) carro(s) ativos desse usuário.
   - Sem body → mantém varredura global (cron diário continua igual, como rede de segurança).
   - Dedupe atual via `maintenance_alerts_sent` (chave `user_id+car_id+alert_type+milestone_km`) já evita e-mail duplicado.

2. **Disparo client-side** no `DataContext`, chamando `supabase.functions.invoke("check-maintenance-alerts", { body: { user_id } })` (fire-and-forget) sempre que:
   - um `earning` é salvo/atualizado/excluído com `km > 0`;
   - `km_adjustment` muda (`updateCarKmAdjustment`);
   - um `expense` de manutenção (óleo/pneus) é salvo (reseta milestone).
   - Throttle simples em memória (1 chamada a cada 15 s por usuário) para não floodar.

3. Cron diário **permanece** como fallback.

### B) Central de notificações — fechar o loop

- Em `Dashboard.tsx`, passar `maintenanceAlerts: maintAlerts` no contexto do `useNotifications` (além de continuar chamando `ensureMaintenanceNotifications` no `useEffect`), assim o hook reage à mudança e re-lista imediatamente.
- Em `useNotifications.ts`, isso já está previsto (`maintenanceAlerts` está nas deps); só falta o consumer enviar.
- Ajuste defensivo: em `ensureMaintenanceNotifications`, se já existir notificação de **mesmo tipo** com status `default` e o novo alerta virou `alert` (overdue), criar a versão alert mesmo assim (hoje só checa ID exato; milestone igual ficaria preso no estado "próximo"). Diferenciar ID por status: `maintenance_<tipo>_<milestoneKm>_<approaching|overdue>`.

### C) Home — "KM planejado atingido"

No `Dashboard.tsx`, substituir o `smartKmValue !== null` por uma renderização condicional do bloco `smartKm`:

- **Caso 1 (atual)** — KM ainda disponível e plano configurado → mostra `R$/km inteligente` (sem mudança).
- **Caso 2 (novo)** — `plan.isPlanningConfigured` e `plan.remainingPlannedKm <= 0`:
  - Renderiza um mini-card com ícone de alerta laranja, título **"KM planejado atingido"**, subtítulo **"Você já usou os KM previstos do mês. Ajuste sua média de KM, dias ou meta para recalcular."** e CTA "Ajustar planejamento" → `/ajustes/planejamento`.
  - Mantém o slot ocupado para não quebrar a ordem dos cards (`homeOrder`).
- **Caso 3** — plano não configurado → permanece oculto (igual hoje).

Mesma mensagem já existe no Planejamento, então o tom fica coerente entre as duas telas.

### D) Verificação pós-mudança

1. Confirmar com `supabase--curl_edge_functions` chamando `check-maintenance-alerts` com `{ user_id: <id_do_lucas> }` e observar `email_send_log` + `maintenance_alerts_sent`.
2. Na conta de teste: salvar earning com KM que cruza o limiar e validar:
   - banner na home;
   - item na central com ícone ciano (próximo) / vermelho (atrasado);
   - e-mail (checar `email_send_log` em segundos).
3. Zerar `remainingPlannedKm` (ex.: registrar KM acima do planejado) e verificar o novo card "KM planejado atingido" na home.

---

## Detalhes técnicos

- `supabase/functions/check-maintenance-alerts/index.ts`: aceitar `await req.json().catch(()=>({}))`; se `body.user_id`, filtrar `.eq("user_id", body.user_id)` na query de `cars`.
- `src/context/DataContext.tsx`: util `triggerMaintenanceCheck(userId)` com throttle em `Map<userId, lastTs>`; chamar dentro dos handlers de earning/expense/maintenance/`updateCarKmAdjustment`.
- `src/lib/notifications.ts`: novo sufixo `_approaching` / `_overdue` no ID + lógica para criar a versão "overdue" mesmo se "approaching" do mesmo milestone já existe (marcar a antiga como dismissed ou só inserir a nova — vou só inserir a nova; usuário pode limpar manualmente).
- `src/pages/Dashboard.tsx`: passar `maintenanceAlerts: maintAlerts` no `useNotifications`; novo render condicional do bloco `smartKm` quando `plan.isPlanningConfigured && plan.remainingPlannedKm <= 0`.
- Sem migração de banco. Sem alteração de RLS. Sem mudança de cron.

## Comunicação ao usuário (após implementar)

- Os 2 e-mails de manutenção do teste atrasado **foram enviados às 07:00 BRT de hoje** — confirmar caixa de entrada / promoções / spam do `lucassgprofissional@gmail.com`.
- Daqui pra frente, e-mail + central + home **disparam juntos em segundos** após cruzar o limiar (registro de KM, ajuste manual ou registro de manutenção).
