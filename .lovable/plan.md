## Ajustes na Landing

### 1. Ordem mobile: conteúdo primeiro, CTA por último

**Regra:** em telas `< md`, qualquer seção que tenha mockup/visual + CTAs deve seguir esta ordem visual:
título → subtítulo → mockup → botões → microcopy ("7 dias grátis…") → LiveDriverCounter.

No desktop a ordem atual (texto/CTA à esquerda, mockup à direita) é mantida.

**Implementação:** usar `flex flex-col` + `order-*` no mobile e voltar ao grid no `md`. Seções afetadas:
- `Hero` — mover bloco de CTAs (linhas ~250-276) para depois do `PhoneFrame` no mobile.
- `FeatureKmInteligente`, `FeatureMetas`, `FeaturePersonalizacao` — mesma regra onde houver CTA abaixo de texto + mockup. Verifico cada uma antes de aplicar.
- `FinalCta` — se houver visual, mockup primeiro; texto e CTA depois.

### 2. Pílula "+ outras" com `+` duplicado

Em `SocialProof` (linha ~2180) a pílula renderiza o ícone `<Plus />` **e** o texto `"+ outras"`. Solução: manter só o ícone `<Plus />` + texto `"outras"` (sem o `+` no texto).

### 3. Novo carrossel de depoimentos

**Conteúdo:** adicionar 2 depoimentos novos (ambos de São Paulo, SP), totalizando 5.

**Comportamento (todas as plataformas):**
- Card central em destaque (100% opacidade, escala 1).
- Cards adjacentes (esquerda/direita) menores (~75% escala), opacidade reduzida e `blur-sm`.
- Auto-advance a cada ~6s; pausa em hover e quando o usuário interage.
- Setas de navegação (◀ ▶) em desktop; swipe/drag no mobile.
- Dots indicadores abaixo (clicáveis) — comunicam quantidade e posição.
- Loop infinito; respeita `prefers-reduced-motion` (desliga auto-advance).
- Acessível: `aria-roledescription="carousel"`, foco visível, navegação por teclado (← →).

**Mobile:** layout lateralizado (mesmo padrão), card central ocupa ~80% da largura, vizinhos espiam nas bordas. Sem stack vertical. Altura fixa para evitar layout shift.

**Implementação:** usar o `embla-carousel-react` já instalado (`src/components/ui/carousel.tsx`) com plugin de autoplay leve próprio (setInterval + `api.scrollNext()`). Estilos dos vizinhos via observação do `selectedScrollSnap` aplicando classes no `CarouselItem`.

### 4. Próximas melhorias sugeridas (para sessão futura — só listar, não executar agora)

**Navegação / UX**
- Header mobile: hoje só tem CTA, sem menu. Adicionar menu hambúrguer com âncoras (#km, #metas, #planos, #faq).
- Botão "voltar ao topo" flutuante que aparece após 600px de scroll.
- Indicador de progresso de scroll no topo (barra fina verde).
- Smooth-scroll com offset do header sticky (hoje a âncora cola embaixo do header).

**Animações**
- Reveal escalonado dentro de seções (features, FAQ) com stagger consistente (já existe `useReveal`, padronizar delays).
- Parallax leve no halo do hero ao rolar.
- Hover nos cards de features: lift + glow accent (hoje só alguns têm).
- Transição entre modos `liquido ↔ bruto` do hero: hoje é cross-fade do glow; adicionar morph suave nos números do mockup.

**Design**
- FAQ: aumentar área clicável e adicionar ícone de chevron animado mais visível.
- Pricing: badge "Mais escolhido" ou "Recomendado" no card anual para reduzir fricção de decisão.
- Comparison: hoje é tabela; testar layout de duas colunas com ícones ✗/✓ coloridos e divider central animado.
- Footer: hoje é minimalista; adicionar links de Privacidade, Termos, Suporte e contato visíveis.

**Conversão**
- Adicionar selo de confiança próximo ao CTA do hero ("Sem cartão · Cancele quando quiser · Dados criptografados").
- Sticky bottom-bar no mobile com CTA "Testar grátis" após o usuário rolar 50% da página.
- Mini-FAQ inline acima do botão de pricing ("E se eu não gostar?" → resposta curta).

**Performance / técnico**
- Hero tem muitas animações simultâneas; medir CLS e LCP no mobile real.
- Lazy-load das seções abaixo do fold com `IntersectionObserver` para o mockup pesado.
- Pré-carregar a fonte do título para evitar FOUT no hero.

---

**Escopo desta execução:** apenas itens 1, 2 e 3. Item 4 fica documentado para aprovação separada.
