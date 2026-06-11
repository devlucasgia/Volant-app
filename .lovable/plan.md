# Estabilização PWA — Fluxos críticos (Entrada e Planejamento)

## Resposta direta à sua pergunta

Não, esse comportamento **não é esperado** e não é como apps consolidados (Nubank, Uber, iFood, WhatsApp) tratam volta de background. PWAs também conseguem o mesmo padrão premium — desde que a app:

1. Não desmonte componentes ao perder/recuperar foco.
2. Não dispare refetch de dados que causa re-render visual em formulários abertos.
3. Mantenha o estado do wizard preservado em memória + fallback persistente, sem reanimar a tela de entrada.

Hoje o Volant ainda tem 3 causas que sobraram da sprint anterior:

### Causa raiz

1. **`useSubscription`** ainda escuta `window.focus`, `online` e `visibilitychange` e dispara `load()` (duas queries Supabase) toda vez que o app volta do background. Isso re-renderiza `RequirePremium` → `AppLayout` → todo o conteúdo, e qualquer drawer/modal aberto sofre re-mount visual (a animação de entrada do Drawer roda de novo porque o Radix Drawer reage à mudança de árvore).
2. **`AppLayout`** usa `<div key={location.pathname}>` com `animate-fade-in-up`. Em re-render do pai, mesmo sem mudar rota, o React pode reconciliar e a animação CSS re-executa em alguns casos (especialmente quando o filho remonta por causa de mudança em contexto premium).
3. **`GuidedFlow`** hoje persiste rascunho corretamente, mas o container interno usa `key={`${step}-${stepIdx}`} className="animate-fade-in"` — toda vez que o pai re-renderiza por causa do refetch acima, o passo atual reanima. Em caso pior (re-mount do `RequirePremium`), o wizard inteiro é desmontado, perdendo `useState` e exibindo "passo 1" antes de o sessionStorage reidratar — exatamente o caso que você reportou.

## Fase 2 — Implementação (escopo cirúrgico, só críticos)

### A. `src/hooks/useSubscription.ts`
- Remover os listeners de `window.focus`, `window.online` e `document.visibilitychange` que disparam `load()`.
- Manter o canal realtime do Supabase (`postgres_changes`) — esse já cobre invalidação quando a assinatura realmente muda no banco, sem custo de re-render ao alternar app.
- Resultado: voltar do background não dispara mais nenhuma query nem re-render em `RequirePremium`/`AppLayout`.

### B. `src/components/AppLayout.tsx`
- Remover `animate-fade-in-up` do wrapper `<div key={location.pathname}>`. Manter o `key` (necessário para resetar scroll/animação entre rotas), mas trocar a animação por uma transição neutra ou remover totalmente. Motivo: essa classe é a fonte da "animação de entrada" visível ao voltar do background quando algo no contexto força re-render.
- Não altera navegação real entre rotas (a transição entre páginas continua suave pelo próprio router).

### C. `src/components/planejamento/GuidedFlow.tsx`
- Remover o `animate-fade-in` do container `<div key={`${step}-${stepIdx}`}>`. O `key` continua trocando entre passos (transição interna), mas sem reanimar quando o pai re-renderiza.
- Garantir hidratação síncrona já existente continua funcionando — sem mudanças no `useRef` de snapshot.

### D. `src/components/EntryDrawer.tsx`
- Sem mudanças de lógica. A correção em A (parar refetch no foco) já elimina o re-mount do Drawer ao voltar do app. A persistência de rascunho (sessionStorage) continua cobrindo qualquer caso residual de reload real.

### O que NÃO vou mexer
- `useDraftPersistence` (sessionStorage continua — atende "só retorno rápido" como você pediu).
- `QueryClient` (já está com `refetchOnWindowFocus/Reconnect/Mount: false` e `staleTime` de 5min — correto).
- Cálculos, rotas, Supabase, schemas, RLS, lógica de planejamento.
- Outros modais (`CarFormDialog`, `CategoryDialog`, `NotificationsSheet`, etc.) — não estão na lista de críticos.

## Arquivos impactados
- `src/hooks/useSubscription.ts` (remover 3 listeners + cleanup)
- `src/components/AppLayout.tsx` (remover `animate-fade-in-up`)
- `src/components/planejamento/GuidedFlow.tsx` (remover `animate-fade-in` do container do passo)

## Critérios de aceite
- Minimizar o app no meio do EntryDrawer e voltar: drawer continua aberto, valores preservados, **sem reanimação de entrada**.
- Minimizar no meio do GuidedFlow (qualquer passo) e voltar: continua no mesmo passo, com os campos preenchidos, sem voltar ao passo 1, sem flash.
- Trocar de aba e voltar não dispara nenhuma chamada à `subscriptions`/`profiles`.
- Premium continua sincronizado quando há mudança real (canal realtime intacto).

## Fase 3 — Relatório final
Ao concluir, te entrego: causa raiz validada, lista exata de arquivos, resumo da solução e status dos critérios.
