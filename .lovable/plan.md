
## 1. DNS / e-mail — esclarecimentos (sem ação no código)

**Boa notícia:** o domínio `notify.usevolant.com.br` **já está verificado e funcionando**. Os e-mails de novo usuário já vão para `suporte@usevolant.com.br` assim que houver novos cadastros.

**Sobre os nomes dos NS (ns3/ns4 × ns5/ns6):** a documentação genérica fala em `ns3` e `ns4`, mas a Lovable atribui o par real por projeto. No seu caso os corretos são **`ns5.lovable.cloud` e `ns6.lovable.cloud`** — e era exatamente isso que você precisava cadastrar. Pode ignorar a menção a ns3/ns4.

**Sobre o "ns6 barrado pela Locaweb":** a verificação só precisa de **pelo menos um NS válido respondendo**, e o `ns5` já está propagado. Por isso o status saiu como verificado mesmo sem o ns6. **Não há problema imediato e nada que precise ser corrigido agora.** Recomendação: assim que sair da janela de aprovação de 48h da Locaweb, adicionar uma segunda entrada NS para `notify` apontando para `ns6.lovable.cloud` (no mesmo registro de subdomínio `notify`, não criar outro). Isso dá redundância e protege a entrega caso o ns5 fique indisponível.

**Para que servem esses NS:** eles delegam o subdomínio `notify` para os servidores DNS da Lovable, que gerenciam SPF, DKIM e MX automaticamente — é assim que provedores como Gmail confirmam que os e-mails saem legitimamente do seu domínio (deliverability).

## 2. Ajustes na landing (`src/pages/Landing.tsx`)

### 2.1 Hero — countdown de motoristas
Adicionar, abaixo do parágrafo principal e antes dos CTAs, uma micro-prova social com contador animado e realista:
- Componente `LiveDriverCounter` com valor base (ex.: começa em ~1.240) e incremento pseudo-aleatório lento (1 motorista a cada 8–15s), congelado se `prefers-reduced-motion`.
- Visual: pílula com dot pulsante verde + "**1.247 motoristas** já dirigindo com clareza" (número usa `AnimatedNumber` já existente).
- Persistir o valor base por dia no `localStorage` para parecer crescimento contínuo entre visitas, sem nunca diminuir.
- Largura e altura fixas para não causar layout shift na hero (testado em mobile 320–414 e desktop).

### 2.2 SocialProof — texto da pílula extra
- Trocar "**adicione outras plataformas**" por algo neutro tipo "**+ outras**" (pílula só visual, não clicável).
- Adicionar logo abaixo da fileira de plataformas uma linha curta e centralizada:
  > "Funciona com qualquer fonte de ganho — você pode adicionar plataformas extras direto no app."

### 2.3 Depoimentos — corrigir invisibilidade + animação
- **Bug:** cada card tem `className="testimonial-card reveal"` mas só o container pai tem `useReveal`. Os filhos nunca recebem `.is-visible` → ficam em `opacity: 0`. Por isso aparece a seção mas não os cards.
- **Fix:** transformar cada card em um item observado individualmente (hook `useReveal` por card via um wrapper `<RevealItem delay={i}>`) — assim entram em cascata conforme aparecem na viewport.
- **Animação recomendada:** fade-in + slide-up suave (já existe via `.reveal`) com stagger de 120ms entre cards + leve `hover:-translate-y-1` e brilho na borda no hover (consistente com pricing-card). Sem efeitos chamativos demais — o tom da página é premium e sóbrio.

### 2.4 Planos — remover parcelamento
- Trocar `12x R$ 7,49` por `R$ 89,90` em destaque (mesma tipografia grande).
- Manter a linha abaixo como **"Equivalente a R$ 7,49/mês"** (remover o "ou R$ 89,90 à vista no cartão · ").
- Manter o badge "4,5 meses grátis".

### 2.5 FAQ — começar todos fechados
- Remover `defaultValue="item-0"` do `Accordion`.

### 2.6 Espaçamento entre seção dos cards (Pricing) e... 
Interpretando como "entre Comparison/Testimonials e Pricing" (sessão dos cards de comparação acima dos preços):
- Reduzir `py-16 md:py-24` da seção `Pricing` para `pt-8 pb-16 md:pt-12 md:pb-20` (apenas o topo encolhe), aproximando visualmente da seção anterior sem perder respiro do FAQ.

### O que NÃO será alterado
- Nada fora de `src/pages/Landing.tsx`.
- Sem mudanças em rotas, dados, autenticação, app `/app`, edge functions ou DB.
- Demais seções (Hero principal, PainStrip, Features, Comparison, FinalCta, Footer) intactas.

## Verificação pós-implementação
- Hero não quebra em 320px, 375px, 414px e desktop (countdown sem layout shift).
- Cards de depoimento aparecem ao rolar com animação em cascata.
- FAQ inicia totalmente fechado.
- Card "Anual" mostra R$ 89,90 + "Equivalente a R$ 7,49/mês".
- Espaçamento Pricing visivelmente menor no topo, mantendo respiro inferior.
