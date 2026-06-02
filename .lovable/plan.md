## Sessão 2 — Melhorias da Landing

---

### 1. Remover totalmente o `LiveDriverCounter`

- Apagar a chamada `<LiveDriverCounter />` no Hero (linha 419).
- Apagar a definição do componente `LiveDriverCounter` (linhas ~2434-2499).
- **Não colocar nada no lugar** — nenhum texto, pill ou prova social substituta.
- Ajustar o espaçamento do bloco de CTA do Hero para não deixar vão grande: revisar o `gap`/`mt-*` do container que segurava o counter para que o microcopy "7 dias grátis. Sem cartão." encerre naturalmente o bloco.
- Limpeza opcional: remover a chave `volant_driver_count` do `localStorage` no mount (one-shot) para não deixar lixo em quem já visitou.

---

### 2. Corrigir ordem mobile do `FeatureKmInteligente`

Bug: CTA aparece antes do mockup no mobile.

Refator (linhas 1022-1097):
- Container vira `flex flex-col md:grid md:grid-cols-2`.
- Texto + bullets: `order-1 md:order-1`.
- Mockup + floaters + legenda: `order-2 md:order-2`.
- CTA + microcopy: separado em `<div>` próprio, `order-3 md:order-1` (no desktop renderiza dentro do bloco de texto como hoje; no mobile vira o último item).

Resultado mobile: Título → Descrição → Bullets → Mockup → CTA → microcopy.
Desktop: inalterado.

---

### 3. Auditoria de hierarquia texto/CTA no mobile

Capturo screenshot do mobile (406px) de cada seção e valido:

| Seção | Verificar |
|---|---|
| Hero | ✅ já corrigido + sem o counter agora |
| SocialProof | respiro |
| FeatureKmInteligente | pós-correção do item 2 |
| FeatureMetas / FeaturePersonalizacao | sem CTA — só conferir |
| SecondaryFeatures | grid de cards |
| Comparison | tabela em 406px |
| Testimonials | ✅ carrossel novo |
| Pricing | ordem e CTAs visíveis |
| FAQ | área clicável |
| FinalCta | só texto + CTA |
| Footer | conferir |

Ajustes pontuais possíveis: reduzir `text-3xl` no mobile, padronizar alinhamento de eyebrows, garantir largura de descrição confortável. Entrega: prints antes/depois.

---

### 4. Demais melhorias aprovadas

**Quick wins:** scroll-offset do header sticky, badge "Mais escolhido" no Pricing, hover unificado nos cards, chevron maior animado no FAQ, selo de confiança no Hero (🔒 dados criptografados · ✓ cancele quando quiser · 💳 sem cartão).

**Navegação mobile:** menu hambúrguer com âncoras, botão "voltar ao topo", barra fina de progresso de scroll.

**Conversão:** sticky CTA mobile que aparece após 50% de scroll e some no `FinalCta`. *(Mini-FAQ removido.)*

**Design maior:** Comparison em duas colunas com ícones ✗/✓; Footer expandido em 3 colunas.

**Animações refinadas:** stagger padronizado do `useReveal`, parallax leve no halo do Hero.

**Performance:** medir CLS/LCP no mobile, preload da fonte do título.

---

### Ordem de execução proposta

**Leva 1 — Bugs + remoção do counter (alta prioridade):**
- Item 1 (remover counter sem substituir, ajustar espaçamento)
- Item 2 (fix CTA KM Inteligente)
- Item 3 (auditoria mobile + ajustes pontuais)

**Leva 2 — Quick wins + navegação mobile.**
**Leva 3 — Conversão + design (Comparison + Footer).**
**Leva 4 — Polimento (animações + performance).**

---

**Ao aprovar, executo a Leva 1** e volto pra confirmação antes da Leva 2.
