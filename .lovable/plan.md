## Sprint — Landing: Seção 2 "Faturamento não é lucro" + Seção 3 "KM Inteligente Boom"

Escopo restrito a `src/pages/Landing.tsx` (componentes `PainStrip` e `FeatureKmInteligente`). Nada fora da landing pública é tocado.

---

### 1. Seção 2 — "Faturamento não é lucro"

Refatorar `PainStrip` (atualmente só um título + parágrafo) para uma seção visual com 3 cards financeiros inspirados nos cards reais do app:

- **Título:** "Faturar bem não significa lucrar bem."
- **Subtítulo curto:** texto enxuto sobre combustível, manutenção, pneus, óleo, seguro, IPVA.
- **3 cards em sequência:**
  1. **Ganho bruto** — R$ 280,00 (azul/info), subtexto "Entrou no dia"
  2. **Custos do dia** — − R$ 92,00 (vermelho/destructive), subtexto "Combustível, veículo e gastos"
  3. **Lucro líquido** — R$ 188,00 (verde Volant, com glow leve), subtexto "Depois dos custos"
- **Conector visual** sutil entre os cards (linha/seta `→` no desktop, vertical no mobile).
- **Microcopy de fecho:** "O Volant transforma registros simples em clareza para decidir melhor."

**Animações (IntersectionObserver + CSS):**
- Cards entram em cascata (fade-in-up, stagger ~150ms): bruto → custos → líquido.
- Valores fazem **count-up** (R$ 0,00 → valor final) usando o hook existente `useCountUp` em `src/hooks/useCountUp.ts`.
- Card de lucro líquido com leve `animate-premium-glow` ao concluir.
- Respeita `prefers-reduced-motion` (snap direto ao valor final — já é o comportamento do `useCountUp`).

---

### 2. Seção 3 — KM Inteligente "Boom"

Refatorar `FeatureKmInteligente` (hoje usa o componente genérico `FeatureSection` + `KmMockup`) para um bloco dedicado, mais alto, com um mockup fiel à tela real `/app/ajustes/planejamento/km` e animação demonstrativa.

**Conteúdo textual:**
- Título: "KM Inteligente: escolha melhor antes de aceitar a corrida."
- Frase de apoio: "Escolha as melhores corridas. Escolha com inteligência."
- Descrição curta sobre meta, custos, KM planejado e fim do mês.

**Mockup inspirado na tela real** (reconstruído em JSX/Tailwind, sem imagem):
- Header "KM Inteligente" com ícone `Gauge`.
- Card principal **R$/KM mínimo agora** com valor em destaque grande + glow verde controlado.
- 4 linhas de cálculo: Meta líquida restante, Custos do veículo, KM planejado restante, Mínimo por km.
- Card "Base do mês" abaixo.
- Mesmo estilo dark premium (border `border-primary/25`, `bg-card`, tipografia consistente com o app).

**Animação principal (sequenciada, baseada em IntersectionObserver):**

| Tempo | Evento | Mudança |
|---|---|---|
| 0s | Estado inicial | R$/km = R$ 2,34; Meta restante R$ 3.480; KM restante 1.690 |
| ~1.2s | Mini-card flutuante verde entra: **"+ R$ 180,00 lucro registrado"** | Pulso suave, partícula/linha verde conecta ao mockup |
| ~2.0s | Recálculo | R$/km transita 2,34 → 2,23 (count-up); legenda "Meta restante menor. R$/km ajustado." |
| ~3.5s | Mini-card flutuante vermelho entra: **"− R$ 35,00 custo registrado"** | Pulso suave |
| ~4.3s | Recálculo | R$/km transita 2,23 → 2,26; legenda "Custo considerado. Referência recalculada." |
| ~5.5s | Estado final | Card principal com `animate-premium-glow`; frase: "O Volant ajusta a rota conforme sua rotina muda." |

A animação roda **uma única vez** ao entrar no viewport (não loop). Em `prefers-reduced-motion`, mostra direto o estado final (R$ 2,26) sem floaters nem transições.

**Bullets explicativos** (3) abaixo do mockup: meta do mês / custos reais / recalcula com a rotina.

**CTA da seção:**
- Botão "Testar grátis por 7 dias" (mesmo estilo `accent-cta` já usado em `FinalCta`, link para `/auth`).
- Microtexto "✓ Sem cartão. Sem cobrança automática."

**Layout responsivo:**
- **Mobile (default):** tudo empilhado vertical — título → mockup → floaters aparecem sobrepostos ao mockup (com `inset` controlado pra não sair da tela) → bullets → CTA.
- **Desktop (`md:`):** grid 2 colunas — texto/bullets/CTA à esquerda, mockup + floaters ao redor à direita.

---

### 3. Implementação técnica

**Arquivo único alterado:** `src/pages/Landing.tsx`.

**Novos componentes internos (no mesmo arquivo, padrão atual do Landing):**
- `PainStrip` — reescrito.
- `PainCard` — card individual da seção 2.
- `FeatureKmInteligente` — reescrito (não usa mais `FeatureSection` genérico).
- `KmBoomMockup` — mockup fiel à tela real.
- `FloatingEntry` — mini-card do lucro/gasto entrando.
- Hook local `useInViewOnce` (IntersectionObserver simples, ~15 linhas) — ou usar approach com `useEffect` + `IntersectionObserver`.

**Reusos:**
- `useCountUp` (já existe) para transição de valores.
- Animações Tailwind já configuradas: `animate-fade-in-up`, `animate-premium-glow`, `animate-premium-breath`, `transitionTimingFunction.premium`.
- Tokens semânticos existentes: `--primary` (verde), `--destructive` (vermelho), `--info` (azul) — sem cores hard-coded.

**Sem novas dependências.** Sem Framer Motion (não está no projeto). Animação 100% CSS + RAF via `useCountUp`.

---

### 4. Mockups baseados no app real

O `KmBoomMockup` é reconstruído visualmente a partir de `src/pages/KmInteligente.tsx` + `src/components/account/SmartKmSection.tsx` (não importados — só replicados em JSX estilizado pra landing, com dados ilustrativos coerentes com a fórmula real de `computeSmartKm`).

Os valores escolhidos (R$ 3.480 meta restante, R$ 480 custos, 1.690 km, R$ 2,34/km) são plausíveis dentro da fórmula real para passar credibilidade.

---

### 5. Performance mobile

- Sem vídeos, GIFs ou imagens externas — tudo CSS/JSX.
- IntersectionObserver dispara animação só quando visível, uma única vez.
- `prefers-reduced-motion` respeitado (count-up snap + sem floaters animados).
- Sem loops infinitos pesados — só os glows já existentes no Tailwind (4s ease).
- Floaters absolutos contidos com `overflow-hidden` no wrapper do mockup para nunca vazar da viewport mobile.

---

### 6. O que NÃO é tocado

`/app` e tudo dentro dele (Home, Histórico, Relatórios, KM Inteligente real, Metas, Central de Veículos), `SmartKmSection.tsx`, `computeSmartKm`, banco de dados, Stripe, checkout, trial, assinatura, autenticação, onboarding, edge functions, notificações, PWA, `index.css`, `tailwind.config.ts`, demais páginas da landing (Hero, FeatureMetas, FeaturePersonalizacao, SecondaryFeatures, FinalCta, Footer).

---

### 7. Critérios de aceite (resumo verificável)

- Seção 2 com 3 cards animados (bruto/custos/líquido) e count-up.
- Seção 3 com mockup do KM Inteligente, 2 floaters sequenciais (+R$ 180 lucro, −R$ 35 custo) e R$/km transitando 2,34 → 2,23 → 2,26.
- Bullets explicativos + CTA "Testar grátis por 7 dias" com microtexto.
- Mobile (viewport ~390px) sem overflow, sem texto espremido, floaters dentro da tela.
- `prefers-reduced-motion` mostra estado final sem animação.
- `/app` continua idêntico.
