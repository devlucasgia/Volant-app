# Sprint — Repaginação dos modais (Ganho + Gasto) + Multi-plataforma

## Resumo

Transformar registro de ganhos: um dia rodado em vários apps vira **uma sessão única** que compartilha KM/horas. Repaginar os modais de Ganho e Gasto. Corrigir armadilha das horas decimais com seletor estilo relógio.

**Regra de ouro:** `summarize`, `planningEngine`, `planejamento`, `smartKm`, `carKm`, AuthContext, DnD e Admin **não são tocados**. O modelo de "linha-âncora" (KM/horas só na primeira linha do grupo) mantém toda a matemática correta.

---

## 1. Migration

```sql
ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS group_id uuid;
CREATE INDEX IF NOT EXISTS entries_group_id_idx ON public.entries (group_id);
```
RLS por `user_id` já cobre.

## 2. Tipos (`src/types/index.ts`)

`groupId?: string` em `EarningEntry`.

## 3. `DataContext.tsx`

- `rowToEntry`: `groupId: r.group_id ?? undefined`.
- `entryToRow`: `group_id: e.groupId ?? null` (só earning).
- **`addEntries(entries)`** — insert em lote, otimista, rollback em erro. **Se a linha-âncora tiver KM > 0, disparar `triggerMaintenanceCheck(user.id)` uma vez** após sucesso (mesma regra do `addEntry`).
- **`removeGroup(groupId)`** — `delete().eq("group_id", …)`, otimista, rollback. Dispara `triggerMaintenanceCheck` se alguma linha removida tinha KM>0.
- `addEntry`/`updateEntry`/`removeEntry` inalterados.

## 4. Modelo "linha-âncora"

- 1 plataforma → 1 linha, `group_id = null` (igual hoje).
- 2+ plataformas → N linhas com mesmo `group_id`, mesma data. **Âncora** (primeira): guarda `km`, `hours`, `notes`. Demais: `km=0`, `hours=0`, `notes=null`, mas com `app/gross/rides` próprios.
- Receita simples (`type==="simple"`) nunca agrupa.
- Mesma plataforma não pode aparecer 2× na sessão.

Como `summarize` soma e `byApp` soma por `app`, `stats.ts` não muda.

## 5. `EntryDrawer.tsx` — separação Ganho × Gasto

Remover toggle interno e o caminho "salvar ganho+gasto juntos". FAB já entrega `tab` certo.

### 5.1 Modal de Ganho (gaveta alta, fundo opaco)

Ordem: Data → "A JORNADA" → Horas (relógio) + KM → "Em quais apps você rodou hoje?" → lista + Total → "OBSERVAÇÕES" → textarea.

**Relógio de horas (~100px):** 2 colunas com snap (h | min), faixa central, "espiada" das vizinhas. Link "digitar" → 2 campos numéricos. Salvar: `hours = h + m/60`, 2 casas (continua decimal no banco). Respeita `prefers-reduced-motion`.

**Quilometragem:** `Segmented` `tone="flat"`, opções **Total** / **Inicial / Final**. Modo I/F: pré-preencher Inicial com `realCurrentKm(activeCar, entries)` (editável), exibir "Rodou X km" ao vivo.

**Lista de plataformas:**
- Linha: logo + nome (toque troca) + Valor (bold) + Corridas (opcional) + × (quando 2+).
- Abre com 1 linha (última usada / Uber) + linha-fantasma "+ Adicionar plataforma" com `animate-breath` (some após primeira adição; respeita reduced-motion).
- Seletor lista operacionais não usadas + "+ Criar nova plataforma" (abre `CategoryDialog type="earning"`). Remover link "+ Nova plataforma" do topo.
- Plataformas `simple` não aparecem em "Adicionar".
- **Total do dia** abaixo (cor `success`, quando > 0).

**Receita simples:** primeira = `simple` → layout antigo (só Valor + Observações). 1 linha, sem `group_id`.

**Build/Salvar (mesma lógica usada também na edição):**
- Descartar linhas com valor ≤ 0.
- 0 válidas → erro "Informe o valor recebido".
- **1 válida** → `addEntry` sem `groupId`.
- **2+ válidas** → `groupId` novo (`crypto.randomUUID()`); âncora com km/horas/notes; demais zeradas; **`addEntries`** (1 insert em lote).

### 5.2 Modal de Gasto (gaveta de conteúdo)

Sem toggle. **Mantém Select de categoria** (emoji+label, "+ Nova categoria", subtipo manutenção). **Valor herói**: grande, centralizado, `text-destructive`, com máscara. Descrição opcional. Toast/atualização KM em manutenção inalterado.

## 6. `History.tsx` — card agrupado

Agrupar earnings com mesmo `group_id` não-nulo num **card único**:
- Cabeçalho: total da sessão + horário.
- Mini-linha por plataforma (logo + label + valor + corridas).
- KM e horas no rodapé (1×). Observações (1×).
- Linhas sem `group_id` e gastos: render igual a hoje. Sessões antigas seguem como cards separados (sem migração).

**Ações operam na SESSÃO inteira:**
- **Swipe-pra-excluir** e item "Excluir" do `DropdownMenu` → `removeGroup(groupId)`. AlertDialog cita que remove a jornada inteira.
- **Swipe-pra-editar** e item "Editar" → reabre modal reconstruindo a sessão (âncora preenche km/horas/notes; cada linha = bloco).
- `SwipeRow` e menu hoje são por-linha; no caso agrupado, recebem a sessão inteira. Registros sem grupo seguem por-linha como hoje.

**Salvar edição (CRÍTICO — ordem segura, sem perda de dado):**
1. Build pela mesma lógica de criação (5.1): 0/1/2+.
   - Se colapsar para **1 plataforma** → `addEntry` sem grupo + `removeGroup(antigo)` no fim.
   - Se 2+ → gerar **`group_id` NOVO** (não reusar o antigo).
2. **`addEntries(novas)` PRIMEIRO**.
3. **Só após sucesso**, `removeGroup(groupIdAntigo)`.

Falha no insert → registro antigo intacto. Falha no delete → no pior caso card duplicado (recuperável), nunca perda.

Registros sem grupo seguem com `updateEntry`/`removeEntry`.

## 7. Encerrar Jornada (preservar)

TimerContext, botão e `openDrawer({ tab:"earning", prefillHours })` **inalterados**. Converter `prefillHours` decimal em h/min ao abrir (`h=floor`, `min=round(frac*60)`); ao salvar volta a decimal.

## 8. Exports de Relatório

**Nada a fazer.** KM/horas só na âncora → iterar linha-a-linha já produz "uma linha por app com KM/horas só na primeira". Confirmar comportamento atual no PDF/Excel/CSV.

## 9. Draft persistence (tolerante a formato antigo)

Estender `EntryDraft` com: array de linhas de plataforma, horas (h/min), modo KM, KM inicial/final. **Restauração tolerante**: rascunho salvo no formato antigo (sem o array) cai num **default de 1 linha** — sem quebrar a abertura do modal. Só na criação, igual hoje.

---

## Arquivos tocados

- `supabase/migrations/<novo>.sql`
- `src/types/index.ts`
- `src/context/DataContext.tsx`
- `src/components/EntryDrawer.tsx` (refactor grande)
- Novo: `src/components/entry/HoursWheel.tsx`
- Novo: `src/components/entry/PlatformRow.tsx`
- `src/pages/History.tsx` (agrupamento + ações por sessão)

## NÃO tocar

`stats.ts`, `planningEngine.ts`, `planejamento.ts`, `smartKm.ts`, `carKm.ts`, `AuthContext`, `useHomeOrder`/`useReportOrder`/`useReportWidgets`, Admin, `TimerContext`/`JourneyModule`, `Reports.tsx` (além do natural).

## Critérios de aceite

- [ ] Uber R$300/12 + 99 R$200/8, 100km, 8h → `summarize`: gross 500, km 100, hours 8, rides 20, R$/km 5,00, R$/h 62,50.
- [ ] Dia de 1 app: comportamento idêntico a hoje (sem `group_id`).
- [ ] Registros antigos do mesmo dia: cards separados, sem erro.
- [ ] Editar sessão: insert das novas linhas **antes** do delete do grupo antigo; falha de rede não apaga jornada.
- [ ] Editar e remover plataformas até sobrar 1 → salva como entrada sem `group_id` (sem grupo órfão).
- [ ] Excluir sessão remove todas as linhas (via swipe ou menu).
- [ ] Swipe e menu agem na sessão inteira quando o card é agrupado.
- [ ] Salvar jornada multi-app com KM > 0 ainda dispara alerta de manutenção (óleo/pneus).
- [ ] Receita simples salva sozinha, sem KM/horas.
- [ ] Relógio 6h30 → `6.5`. Digitar 6 e 30 → `6.5` (nunca 6.30).
- [ ] Encerrar Jornada continua pré-preenchendo horas no relógio.
- [ ] KM I/F pré-preenche Inicial com `realCurrentKm` (editável), total ao vivo.
- [ ] `prefers-reduced-motion` desliga animações.
- [ ] Plataforma duplicada não pode entrar 2× na sessão.
- [ ] Rascunho antigo (sem array de plataformas) restaura como 1 linha sem quebrar.
- [ ] Valor em destaque (ganho por linha; gasto herói vermelho).
