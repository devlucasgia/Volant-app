
# Plano — 4 otimizações de consumo (respostas + execução)

Antes da execução, respondo ponto a ponto. Nenhuma linha de código é tocada nesta resposta.

---

## Respostas às perguntas

### 1. O cron de email é sensível a tempo?

Sim, parcialmente. A cron `process-email-queue` (id=1) processa **duas filas** em ordem:

- `auth_emails` — **time-sensitive**: signup, magic link, **redefinição de senha**, troca de email, reauth.
- `transactional_emails` — não-urgente: trial-ending-soon, trial-ended, weekly-summary, maintenance-alert, welcome, etc. (todas confirmadas como transacionais, **nada de marketing puro**).

A arquitetura atual (Lovable Emails) **usa uma única cron para as duas filas**, com `auth_emails` tendo prioridade dentro de cada execução. Trocar para 30s afetaria reset de senha (até 30s de latência), o que é perceptível.

**Maior intervalo seguro recomendado: 15 segundos.**
- Reduz volume de 17.280/dia → 5.760/dia (–66%, ≈ 213k/mês a menos).
- Latência máxima de reset de senha: 15s (aceitável, padrão de mercado).
- Sem mexer na infraestrutura de fila (não dá pra separar em duas crons distintas sem reescrever `process-email-queue` e a setup de email — esforço desproporcional ao ganho marginal de 15s→5s).

**Não separamos em fila rápida própria** porque a infra de Lovable Emails é compartilhada e gerenciada — fragmentar quebraria o reset/refresh idempotente da `setup_email_infra`. 15s atende o requisito.

### 2. Limite de 1.000 entries quebra algo?

**Sim, quebra cenários reais.** Mapeei todos os consumidores de `entries` do `DataContext`:

| Consumidor | Risco se cortar a 1000 |
|---|---|
| `History.tsx` | mostra **todos** os registros — usuário antigo perderia visualização de meses passados |
| `Reports.tsx` | filtra por período, mas inclui exports PDF/Excel — exportação de 12 meses ficaria incompleta |
| `carKm.realCurrentKm` | soma **KM dirigido desde sempre** para calcular KM atual do veículo — corte → KM do carro fica errado para veterano |
| `planningEngine` / `smartKm` | usa só o mês corrente — OK |

**Decisão revisada:** em vez de `range(0, 999)` fixo, vou usar **janela por data: últimos 18 meses** (`entry_date >= now() - interval '18 months'`). Cobre 100% dos relatórios mensais/anuais, exportações típicas, KM do veículo (carros raramente excedem isso de histórico relevante), e ainda assim corta payload pesado de usuários veteranos. Para acessar registros mais antigos no Histórico, adiciono um botão **"Carregar histórico completo"** que faz refetch sem limite.

Se preferir simplesmente manter o `range(0, 9999)` atual (que hoje cobre todos os usuários ativos, já que o maior usuário tem ~80 entries), posso **pular esse item** — o ganho atual é pequeno e o risco de regressão existe. Marco esse item como **opcional**, decisão sua.

### 3. Consolidação `useSubscription` → `AccessContext`

Já existe o `AccessContext` mas ele só expõe `isFull`. **7 lugares chamam `useSubscription` hoje:**

`RequirePremium` (raiz), `Dashboard`, `Settings`, `NotificationsSheet`, `TrialEndingModal`, `SubscriptionSheet`, `Settings`.

Plano:
1. `RequirePremium` continua sendo o **único caller** de `useSubscription`. Já roda 1x na raiz.
2. Expandir `AccessProvider` para receber o `SubscriptionState` inteiro (não só `isFull`) e expor via `useAccess()`.
3. Trocar as 6 chamadas extras de `useSubscription(user?.id)` por `useAccess()` (mantendo nomes dos campos: `isPaidPremium`, `internalTrialActive`, `internalTrialEndsAt`, `refetch`).
4. `useSubscription.ts` **permanece** como hook único do `RequirePremium` (não deletar — é o coração do fail-closed).

**Teste explícito de 3 cenários** (sandbox antes de marcar como feito):

| Cenário | Setup no banco | Comportamento esperado |
|---|---|---|
| **Trial ativo** | `profiles.trial_access_granted=true`, `trial_ends_at = now()+5d`, sem subscription | `isActive=true`, `isPaidPremium=false`, `internalTrialActive=true`, app navegável, sem paywall, modal de fim de trial não aparece |
| **Pago ativo** | subscription com `status='active'`, `current_period_end` futuro, environment correto | `isActive=true`, `isPaidPremium=true`, sem paywall, NotificationsSheet mostra estado premium |
| **Trial expirado, sem pagamento** | `trial_access_granted=true`, `trial_ends_at = now()-1d`, sem subscription | `isActive=false`, `internalTrialExpired=true`, app entra em modo limited, paywall abre nos gates |

Vou rodar esses testes via Playwright (login com usuário real de cada cenário) ou inspeção SQL do estado renderizado. Se algum cenário não bater, **reverto a consolidação** antes de mergear.

### 4. `email_send_log` e LGPD

**Sim, é registro de comprovação de envio**, usado tanto para análise operacional quanto evidência de que comunicações transacionais foram enviadas (relevante para LGPD/SAC). Não é registro de consentimento (esse fica em `email_unsubscribe_tokens` e `suppressed_emails`).

**Ajuste:** em vez de purgar a 90 dias, **retenção de 180 dias** com purge mensal. Isso:
- Cobre janela razoável de auditoria/SAC (6 meses).
- Mantém logs além do ciclo de cobrança/trial (que é mensal/anual).
- Reduz crescimento da tabela sem destruir histórico útil.
- `suppressed_emails` e `email_unsubscribe_tokens` **não são tocados** (são o registro permanente que LGPD exige).

Volume atual: 337 linhas em 30 dias → projeção: ~2k/ano. Mesmo com 180 dias, tabela fica em ~1.000 linhas. Custo é mínimo, mas a rotina previne crescimento descontrolado.

### 5. Algo toca em `/admin`?

Verifiquei `src/pages/Admin*.tsx`, `src/components/admin/` e `RequireAdmin.tsx`:

- **Nenhum** componente do admin usa `useSubscription` ou `useAccess`.
- `RequireAdmin` faz sua própria checagem direto em `user_roles`.
- Admin não monta `AppLayout` nem `RequirePremium`.
- Cron de email é backend puro — admin não chama.
- `DataContext` é montado na raiz, mas admin não consome `useData()`.

**Nada deste plano afeta o /admin.**

---

## Execução proposta (na sua ordem de prioridade)

### Item 1 — Cron de email: 5s → 15s

- Atualizar `cron.job` id=1: `schedule := '15 seconds'`.
- Não recriar a job; apenas `cron.alter_job` (via insert tool, dado é específico do projeto).
- Sem alteração em código de aplicação. Sem deploy de edge function.
- **Validação:** após mudança, verificar via `cron.job_run_details` que dispara a cada 15s e que e-mails pendentes ainda processam.

### Item 2 — DataContext: janela de 18 meses (opcional)

- `DataContext.useEffect`: trocar `.range(0, 9999)` por `.gte('entry_date', new Date(now - 18 months).toISOString())`.
- Adicionar estado `hasMoreHistory: boolean` + função `loadFullHistory()` exposta no Context.
- `History.tsx`: se filtro/busca não acha nada e `hasMoreHistory`, mostrar botão "Carregar histórico completo".
- `Reports.tsx`: se usuário escolher período "todos" ou export anual e dados parecerem truncados, chamar `loadFullHistory()` antes de calcular.
- **Validação:** verificar `carKm.realCurrentKm` retorna mesmo valor de antes para todos os carros de teste.
- **Decisão sua:** executar ou pular. Recomendo **pular** dado o volume atual (maior usuário tem ~80 entries) — não vale o risco de regressão sutil.

### Item 3 — Consolidação useSubscription → AccessContext

- `AccessContext.tsx`: trocar prop `isFull: boolean` por prop `subscription: SubscriptionState`. Expor todos os campos via `useAccess()`.
- `RequirePremium.tsx`: passa `sub` inteiro pro provider.
- 6 arquivos: trocar `useSubscription(user?.id)` por `useAccess()` mantendo desestruturação idêntica.
- Manter `useSubscription.ts` intacto.
- **Testes**: rodar os 3 cenários acima via Playwright + inspeção UI.
- **Ganho estimado**: leituras de `profiles` (#5 da tabela: 7.236 chamadas) caem para ~1 por sessão.

### Item 4 — Retenção `email_send_log`: 180 dias, purge mensal

- Migration: criar função `public.purge_old_email_send_log()` que faz `DELETE FROM email_send_log WHERE created_at < now() - interval '180 days'`.
- Insert tool: criar cron job mensal `0 3 1 * *` (dia 1 às 03:00) chamando essa função via `SELECT public.purge_old_email_send_log();`.
- Não toca em `suppressed_emails` nem `email_unsubscribe_tokens`.

---

## Resumo de risco

| Item | Risco | Reversível? |
|---|---|---|
| 1. Cron 5→15s | Baixo (latência aceitável em reset) | Sim, 1 SQL |
| 2. Janela 18m | **Médio** (sugiro pular) | Sim, 1 edit |
| 3. AccessContext consolidado | Baixo se os 3 testes passarem | Sim, revert do PR |
| 4. Purge 180d | Mínimo (não toca consentimento) | Sim, cancelar job |

**Aguardando sua aprovação.** Confirme:
- Item 2: **executar** ou **pular**?
- Itens 1, 3, 4: prosseguir?
