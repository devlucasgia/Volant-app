
# Landing Page Volant — Análise + Plano de Execução

## 1. Análise da referência enviada

**O que funciona bem**
- Paleta verde + preto coerente com a identidade do app.
- Hero com dois mockups lado a lado cria prova visual imediata.
- Bloco "Faturamento não é lucro" tem um insight forte e diferenciado.
- Seção "Seu carro em dia" comunica bem o eixo veículo.
- Bloco premium no rodapé cumpre função de fechamento.

**Pontos a melhorar (críticos)**
1. **Prints "soltos"**: os mockups aparecem sem contexto narrativo — só decoração. O usuário pediu explicitamente para evitar isso.
2. **Hierarquia repetitiva**: três blocos de "benefícios" em sequência (Faturamento não é lucro / Como ajuda no dia a dia / Recursos que transformam) dizem coisas parecidas. Falta narrativa progressiva.
3. **Diferenciais não aparecem em destaque**: KM inteligente, Metas adaptativas e Personalização — que são os verdadeiros vetores de venda — estão diluídos em listas genéricas.
4. **Falta posicionamento competitivo**: nada diz "o que outros apps NÃO fazem". O usuário pediu foco em diferenciais de mercado.
5. **Tom "inteligente" ausente**: a palavra "inteligente" aparece pouco, e não há narrativa de "app que pensa com você".
6. **Zero prova social**: sem depoimentos, sem números (motoristas ativos, R$ economizados), sem print de avaliação.
7. **Sem comparativo Volant vs. caderno/planilha/concorrentes**.
8. **CTA fraco**: "Começar agora" repetido sem urgência ou clareza ("Teste 7 dias grátis — sem cartão" converte mais).
9. **Sem FAQ**: motorista de app tem dúvidas previsíveis (preço, cancelamento, funciona offline, precisa de cartão).
10. **Sem seção de preço explícita**: só "Assinatura premium" no fim, sem valor visível. Motorista decide rápido — esconder preço derruba conversão.
11. **Footer pobre**: faltam links legais (Termos, Privacidade, LGPD), contato e CNPJ — essencial para go-live pago.
12. **Mobile-first não está claro**: o motorista vai abrir isso no celular. A referência é claramente desktop-first.

## 2. Nova estrutura proposta (mobile-first, narrativa por diferencial)

```text
1.  Header fixo + logo + CTA "Teste grátis"
2.  Hero — promessa central + 1 mockup animado + CTA + prova rápida
3.  Faixa de dor — "Você sabe quanto sobra de verdade no fim do dia?"
4.  Diferencial #1 — KM Inteligente (mockup contextual + explicação)
5.  Diferencial #2 — Metas que se adaptam (mockup + explicação)
6.  Diferencial #3 — App 100% personalizável (mockup + explicação)
7.  Volant vs. outros apps — tabela comparativa simples
8.  Outras funções (jornada automática, manutenção, custos) — grid 2x2
9.  Como funciona — 3 passos (cadastro → registrar → ver lucro real)
10. Prova social — depoimentos + números (mesmo que iniciais/honestos)
11. Preço — card único Premium + "Teste 7 dias grátis sem cartão"
12. FAQ — 6 a 8 perguntas
13. CTA final + footer completo (legal, contato, redes)
```

Cada seção de diferencial usa **um mockup real do app integrado à narrativa** (não solto), com callouts apontando a feature.

## 3. Decisões de copy / posicionamento

- Headline principal: "O app que pensa com você ao volante."
- Subheadline: "Volant calcula seu KM mínimo, adapta suas metas e mostra seu lucro real — automático, todos os dias."
- Tag de marca: "Inteligência para quem vive da rua."
- Linguagem: PT-BR, direta, sem jargão financeiro, tom Nubank/iFood.
- CTA padrão: "Testar 7 dias grátis" (sem cartão, se confirmado).

## 4. Decisões técnicas

- **Rota**: `/` da landing. App fica em `/app` e auth em `/entrar` (conforme alinhado anteriormente).
- **Mesma base do app**: landing fica no mesmo projeto Lovable, em rotas públicas fora do `RequireAuth`/`RequirePremium`. Compartilha tokens de design e assets.
- **Mockups**: gerar 4 a 5 screenshots reais do app (Home, KM Inteligente, Metas, Personalização, Custos) em alta qualidade e usar como `<img>` dentro de molduras de celular SVG — sem fotos pesadas.
- **Animações**: Tailwind + Motion para revelações sutis (fade/slide). Nada pesado.
- **SEO**: title, meta description, OG image, JSON-LD `SoftwareApplication`, H1 único, alts em todas as imagens, sitemap, robots.
- **Analytics**: GA4 ou Plausible + eventos nos CTAs (preparar para tráfego pago).
- **Sem impacto no app logado**: nenhuma mudança em `RequirePremium`, `useSubscription`, Stripe, Supabase ou rotas autenticadas.

## 5. Plano de execução (sprints)

**Sprint 1 — Estrutura + Hero + 3 diferenciais (entrega visível)**
- Rota `/` pública, header, hero, seções 1–6, footer básico.
- Gerar 3 mockups (KM, Metas, Personalização).
- Mobile-first com revisão em 390px e desktop.

**Sprint 2 — Conversão (comparativo, prova, preço, FAQ)**
- Seções 7–12, FAQ com accordion, tabela comparativa, card de preço.
- Depoimentos (placeholders honestos enquanto não há reais).
- Analytics + eventos de CTA.

**Sprint 3 — Polimento + SEO + legal**
- Animações Motion, otimização de imagens (WebP), Lighthouse ≥ 90.
- Páginas `/termos` e `/privacidade` (essenciais para Stripe live).
- Sitemap, robots, OG, JSON-LD.

## 6. Estimativa de créditos (realista)

| Entrega | Créditos |
|---|---|
| Sprint 1 — base + hero + 3 diferenciais | 30–45 |
| Sprint 2 — conversão + FAQ + preço | 25–40 |
| Sprint 3 — SEO, animação, legal, polimento | 20–35 |
| **Total** | **75–120** |

Variáveis que mexem no custo: número de iterações de copy, ajustes finos de design, geração/regeração de mockups, e quantos componentes serão criados do zero vs. reuso do design system.

**Recomendação**: reservar **80 créditos para a primeira versão funcional e bonita** (Sprint 1+2 enxutos) e guardar 30–40 para iterar após ver no ar. Mandar referências de copy e estrutura prontas reduz custo em ~30%.

## 7. Respostas às suas dúvidas

**1) Quem cria as novas páginas dentro do domínio?**
Sim, eu crio. No Lovable, novas rotas (ex.: `/`, `/termos`, `/privacidade`, `/precos`) são apenas novos arquivos em `src/pages/` registrados em `src/App.tsx`. O domínio `usevolant.app` já está conectado, então qualquer rota nova vira `usevolant.app/rota` automaticamente após publish.

**2) Mesmo projeto ou separar?**
**Mesmo projeto.** Vantagens:
- Compartilha design system, componentes (`Button`, `Card`), tokens de cor e tipografia — landing fica idêntica visualmente ao app.
- CTA "Começar agora" leva direto pro fluxo de cadastro no mesmo domínio (sem cross-domain, sem perda de sessão).
- Um único deploy, um único domínio, um único Stripe/Supabase.
- SEO concentrado em um domínio só.

Separar só faria sentido se a landing fosse construída em outra stack (ex.: Webflow/Framer) — o que aqui não se justifica.

## 8. O que NÃO vai mudar

- Nenhuma rota autenticada, `RequirePremium`, Stripe, Supabase ou cálculos do app.
- Dashboard, History, Reports, Settings continuam intocados.
- Onboarding e paywall do app continuam iguais.

## Próximo passo

Se aprovar o plano, na próxima mensagem (já em build mode) começo pela **Sprint 1**: rota pública `/`, hero com mockup real do app, e as 3 seções dos diferenciais principais. Antes disso, me confirma:
- Pode usar **headline "O app que pensa com você ao volante"** ou prefere outra direção?
- Posso assumir **"Teste 7 dias grátis sem cartão"** como CTA, ou o trial exige cartão?
- Tem preço final definido (mensal/anual) pra estampar no card de preço?
