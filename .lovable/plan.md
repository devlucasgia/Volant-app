Tudo em `src/pages/Landing.tsx` (mais alguns keyframes em `HeroStyles`). Sem backend, sem mudar lógica.

---

## 1. Hero

### 1.1 Aproximar os cards do mockup
Cards flutuantes (linhas ~283–340) estão muito afastados no desktop (≥ lg) e o de Custos sobrepõe o texto à esquerda em telas grandes.

- **Manutenção:** trocar `-left-16 ... lg:-left-20` por `left-2 lg:left-4` (encostado no mockup, sem invadir a coluna de texto).
- **R$/KM Inteligente:** trocar `right-0 ... lg:-right-8` por `right-2 lg:right-4` (espelho do card de manutenção).
- **Custos do veículo:** trocar `-left-20 ... lg:-left-24` por `left-2 lg:left-4`, descer um pouco (`bottom-24`) para não encostar no card de Manutenção nem sobrepor o texto/CTA do hero.
- **Personalização:** trocar `right-0 ... lg:-right-8` por `right-2 lg:right-4`.
- Garantir que a coluna esquerda do hero tenha `relative z-10` se necessário, mas o objetivo principal é trazer os 4 cards para a faixa do mockup. Mobile (`md:hidden`) continua igual.

### 1.2 Cards respondem ao modo Liquido/Bruto + flutuam
- Envolver os 4 cards flutuantes (e o `FloatingCard` `R$/KM Inteligente`) em wrappers com `hero-float` (já existe), aplicando `animation-delay` diferentes (0s, 0.8s, 1.6s, 2.4s) para que não flutuem em uníssono.
- Ícone + valor destacado de cada card passa a usar a variável `--accent-now` (já definida em `[data-hero-mode]` linhas 607–608):
  - Card Manutenção: ícone `Wrench` em `text-[hsl(var(--accent-now))]`, transition de cor 700ms.
  - Card R$/KM Inteligente (`FloatingCard` highlighted): valor `R$ 2,42` e ícone `Gauge` em `--accent-now`. Ajustar `FloatingCard` para aceitar opcional `accent` que troque a cor do ícone/valor quando `highlighted`.
  - Card Custos do veículo: ícone `Wallet` em `--accent-now`.
  - Card Personalização: ícone `LayoutGrid` + chip “A” central em `--accent-now`.
- Demais textos/valores permanecem nas cores atuais — só ícone principal + número/elemento de destaque acompanham a cor.

### 1.3 Ajustes finos nos cards
**Card Manutenção (atualmente 480 km com barra primary + selo verde "Em dia"):**
- Trocar a barra de progresso para amarelo: `bg-warning` (token semântico já existente). Manter largura `w-[85%]`.
- Trocar selo "Em dia" por "Próximo" com ícone `Hourglass` (lucide). Cor warning: `bg-warning/15 text-warning` no chip. Importar `Hourglass` no topo.

**Card Custos do veículo:**
- Trocar linha "Combustível R$ 320" por "IPVA (mês) R$ 140" (valor representativo do IPVA diluído por mês — ~R$ 1.680/ano).
- Manter linha "Manutenção R$ 160".
- Atualizar "Total /mês" para `R$ 300` (soma 140 + 160).
- Cor do total: trocar `text-primary` por `text-destructive` (é custo, deve ser vermelho).

---

## 2. KM Inteligente — ordem no mobile

Em `FeatureKmInteligente` (linhas ~872–945), o mobile hoje mostra o mockup primeiro porque a coluna do texto usa `order-2 md:order-1` e a do mockup `order-1 md:order-2`.

- Inverter: coluna texto vira `order-1 md:order-1` (sem `order`), mockup vira `order-2 md:order-2` — fica igual ao comportamento de Metas/Personalização (texto antes, mockup depois no mobile). Manter posições no desktop intactas.

---

## 3. Personalização — animar mockup em loop

Refatorar `PersonalizacaoMockup` (linhas 1698–1743) para um loop sutil mostrando reorganização/ativação:

- Estado `tick` incrementando a cada ~2.2s via `setInterval` (com cleanup e respeito a `prefers-reduced-motion`).
- A cada tick, alternar entre 3 cenas:
  1. **Reordenando:** o card "KM Inteligente" sobe uma posição (troca com "Meta do dia"), com `transition: transform 600ms cubic-bezier(0.22,1,0.36,1)` aplicado via `translateY` ou simplesmente reordenando o array e usando `transition-all` no container — preferir reordenar array + animar via `framer-motion`-less abordagem: cada card recebe `style={{ transform: translateY(...) }}` calculado pela posição alvo.
  2. **Desativando:** card "Manutenção" recebe estado `hidden=true` → muda label de "visível" para "oculto", reduz opacidade para `opacity-40`, ícone fica cinza.
  3. **Voltando ao normal** (estado base) antes de reiniciar.
- Para o "exemplo na home sendo desativado": adicionar mini-preview Home no topo do mockup substituindo o cabeçalho atual quando a cena 2 ativa? Solução mais simples e clara: manter o mockup atual (tela "Organizar cards") e, quando o card "Manutenção" é desativado, mostrar um pequeno toast/badge flutuante dentro do mockup ("Removido da Home ✓") com fade in/out de 1s. É a forma mais limpa sem reescrever o mockup; o usuário pediu se fosse possível e essa é a melhor aproximação.
- Adicionar também `hero-float` no wrapper externo já está coberto pelo `FeatureSection` (linha 1289). Manter.
- Reduced motion: não roda o interval, mantém estado base.

---

## 4. Seção "Recursos que trabalham por você"

### 4.1 Ícone do eyebrow "Mais inteligência no seu dia" (linha 1158)
Trocar `<Sparkles className="h-3 w-3" />` por `<Brain className="h-3 w-3" />` (lucide). Importar `Brain` no topo.

### 4.2 Textos dos cards (linhas 1131–1152)
- **Jornada automática** (`desc`): trocar por
  > "Inicie sua jornada de trabalho escolhendo a meta do dia, controle suas pausas e finalize registrando ganhos e gastos com as horas já preenchidas."
- **Relatórios claros** (`desc`): manter a frase atual e acrescentar:
  > "Bruto, líquido, R$/h, R$/km e médias por período em um lugar. Sem jargão financeiro. Exporte tudo em PDF, Word ou Excel quando quiser."

---

## Não tocar
- Lógica de `useSubscription`, Stripe, Supabase.
- Estrutura/SEO/`<Header>`/`<Footer>`/`FinalCta`.
- Animações já implementadas em KM Inteligente (transações) e Metas (loop de estados).
- Tema/cores globais.

## QA
- Desktop ≥ 1280px: 4 cards flutuantes encostam no mockup, sem cobrir o texto do hero, todos flutuando com defasagem; ícones/valor de destaque mudam entre verde (líquido) e azul (bruto) suavemente.
- Mockup do hero alterna líquido/bruto e os cards acompanham.
- Card Manutenção: barra amarela + selo "Próximo" com ampulheta.
- Card Custos do veículo: "IPVA (mês) R$ 140", "Manutenção R$ 160", total `R$ 300` em vermelho.
- Mobile 375: na seção KM Inteligente o título/bullets aparecem antes do mockup.
- Personalização: cards trocam de ordem suavemente em loop e card "Manutenção" alterna ativo/inativo com mini toast "Removido da Home".
- Seção "Recursos": ícone do eyebrow é cérebro; textos de Jornada e Relatórios atualizados.
- `prefers-reduced-motion`: tudo respeitando.
