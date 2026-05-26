# Plano — 3 ajustes de navegação no /app

Os três pontos são simples, seguros e isolados (só camada de navegação/UI, nada de banco, cálculo, auth ou Stripe). Minha opinião: todos fazem sentido e devem ser corrigidos juntos.

---

## 1. Scroll preso entre telas

**Problema:** ao trocar de rota, o React Router não reseta o scroll. Se o usuário rolou a Home até o fim e abre Ajustes, a nova tela aparece rolada.

**Correção:** criar um componente `ScrollToTop` que escuta `useLocation()` e faz `window.scrollTo({ top: 0, left: 0 })` sempre que o `pathname` muda. Montar dentro do `<BrowserRouter>` em `App.tsx`.

Algumas telas (KM, Personalização etc.) já têm `window.scrollTo` no `useEffect` — vou manter, pois o `ScrollToTop` global cobre o resto sem conflito.

**Não afeta:** modais/drawers (Sheet, Dialog, EntryDrawer) — eles não mudam rota, então continuam como estão. O comportamento desejado para modais já é o padrão (abrem do topo do próprio conteúdo).

---

## 2. Voltar de Termos/Privacidade indo para `/` em vez de `/auth`

**Problema:** o botão "voltar" em `Termos.tsx` e `Privacidade.tsx` é um `<Link to="/">` fixo. Se o usuário abriu a partir do `/auth`, ele cai na landing.

**Correção:** trocar o `<Link to="/">` por um `<button onClick={() => navigate(-1)}>`, com fallback para `/` caso não haja histórico (ex.: usuário abriu o link direto). Isso devolve para a tela exata de origem (auth, app, landing, etc.).

---

## 3. Cards da Home → retorno para origem (Home), não para Ajustes

**Problema:** `MetasInteligentes`, `KmInteligente` e `PersonalizacaoSaudacao` têm o "voltar" hard-coded para `/ajustes/planejamento` ou `/ajustes/personalizacao`. Quando abertos pela Home, o retorno vai para Ajustes em vez de voltar para a Home.

**Correção:** ao navegar a partir da Home (`Dashboard.tsx`), passar `state: { from: "/app" }` no `navigate(...)`. Nas três telas de destino, o handler de voltar lê `location.state?.from` e usa:
- se `from` existir → `navigate(from)`
- senão → fallback para a rota de Ajustes correspondente (mantém comportamento atual quando abre via Ajustes)

Telas afetadas:
- `src/pages/Dashboard.tsx` — 3 `navigate(...)` recebem `{ state: { from: "/app" } }`
- `src/pages/MetasInteligentes.tsx` — `onBack` lê `location.state?.from`, fallback `/ajustes/planejamento`
- `src/pages/KmInteligente.tsx` — idem
- `src/pages/PersonalizacaoSaudacao.tsx` — idem, fallback `/ajustes/personalizacao`

Não vou alterar as outras subtelas de Ajustes (que não são acessíveis pela Home) para não expandir o escopo.

---

## Arquivos a alterar

- **Novo:** `src/components/ScrollToTop.tsx`
- **Editar:** `src/App.tsx` (montar `<ScrollToTop />`)
- **Editar:** `src/pages/Termos.tsx`, `src/pages/Privacidade.tsx` (voltar com `navigate(-1)`)
- **Editar:** `src/pages/Dashboard.tsx` (passar `state.from`)
- **Editar:** `src/pages/MetasInteligentes.tsx`, `src/pages/KmInteligente.tsx`, `src/pages/PersonalizacaoSaudacao.tsx` (ler `state.from` no voltar)

## Segurança / fora de escopo

Nada de Stripe, Supabase, autenticação, cálculos, banco, onboarding, PWA ou landing pública é tocado. Mudanças são exclusivamente de roteamento e UX.

Aprova para eu implementar?