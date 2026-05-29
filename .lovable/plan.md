
# Refinos da página de vendas — Hero, KM Inteligente, Metas

Tudo no `src/pages/Landing.tsx` (mais alguns `@keyframes` em `HeroStyles`). Nada de backend, nada fora de UI.

---

## 1. Hero — pequenos ajustes + cards flutuantes redesenhados

### 1.1 Saudação do mockup
`HomeMockup` (linha 1344): trocar `title="Olá, Lucas ☕"` por `title="Olá, Motorista 👋"`.

### 1.2 Microtexto abaixo do CTA
Linha 248: trocar `7 dias grátis. Cancele quando quiser.` por `7 dias grátis. Sem cartão.` (mantém o ícone `Check` como está).

### 1.3 Substituir os 3 cards flutuantes redundantes
Hoje os 4 floaters (`Meta do mês`, `R$/KM`, `R$/hora`, `Lucro líquido hoje`) repetem dados já visíveis no mockup. Vamos:

- **Manter** o card `R$/KM Inteligente` (é o highlight do produto, único realmente diferenciado).
- **Substituir os outros 3** por mini-mockups que mostram outras telas reais do app, criando um novo componente `FeatureFloatCard` (mais alto que o `FloatingCard` atual, com um corpinho de conteúdo abaixo do label).

Os 3 novos floaters:

1. **Manutenção** — header com ícone `Wrench` + label `Manutenção` + linha "Troca de óleo em **480 km**" com mini-barra ~85% (cor warning/primary) e selo `Em dia`. Referência: tela `ManutencaoPreventiva` (notificação preventiva).
2. **Custos do veículo** — header com ícone `Wallet` + label `Custos do veículo` + 2 mini-linhas: `Combustível R$ 320` e `Manutenção R$ 160`, com total `R$ 480 /mês` em destaque. Referência: `VehicleCostsCard` / página `CustosVeiculo`.
3. **Personalização** — header com ícone `LayoutGrid` + label `Personalização` + um exemplo visual de "Tamanho do texto" com 3 chips `A` `A` `A` (pequeno/médio/grande), com o `A` médio destacado em primary. Referência: `FontSizeSheet` / `PersonalizacaoAparencia`.

### 1.4 Reposicionar os floaters para parecerem "ligados" ao mockup
Reorganizar os `absolute` para que cada card flutuante fique próximo da seção correspondente dentro do telefone, com um sutil conector visual:

- **Manutenção** — no topo-esquerda, na altura do header/`Olá, Motorista` (insinua notificação que o app empurra ao motorista).
- **R$/KM Inteligente** — direita, na altura do card `R$/KM` do mockup (já é o caso hoje; manter).
- **Custos do veículo** — esquerda-baixo, na altura do bloco `Performance/Gastos` (parece "sair" dos gastos R$ 250,00).
- **Personalização** — direita-baixo, na altura do bottom nav (insinua reorganização de cards/tema).

Adicionar a cada card flutuante uma fina linha conectora decorativa (`absolute` 1px com gradient pra `transparent`) apontando pro mockup. Mobile permanece como hoje (1 card compacto, `R$/KM`).

### 1.5 Novo componente
Criar `FeatureFloatCard({ className, label, icon, children, highlighted? })` ao lado de `FloatingCard`. Reaproveita visual (border, blur, sombra, glow opcional `hero-glow-soft`) e renderiza `children` em vez do `value` grande. Manter `FloatingCard` para o caso highlighted `R$/KM`.

---

## 2. Seção KM Inteligente — animações

### 2.1 Animação de transações com efeito maior e cards permanentes
No `FeatureKmInteligente` (linhas 751–880):

- **Aumentar os valores** pra causar oscilação maior no `R$/km mínimo`:
  - Lucro: `+ R$ 180,00` → `+ R$ 320,00`.
  - Custo: `− R$ 35,00` → `− R$ 95,00`.
  - Ajustar `kmValue` por fase: inicial `2.34` → após lucro `2.05` → após custo `2.18` (variação maior, fácil de perceber). Ajustar `goalRemaining`/`costsValue` proporcionalmente.
- **Duração mais longa** para usuário desatento perceber:
  - Lucro entra 1.2s → permanece, recalcula 2.0s → 2.6s (mais respiro).
  - Custo entra 4.0s → recalcula 4.8s.
  - Estabiliza em 6.0s (em vez de 5.5s) — totalizando ~6s.
  - Aumentar `useCountUp` de 600/500ms para 900/800ms pra interpolação ficar mais visível.
- **Não remover os cards após a animação:** trocar a condição `visible={phase >= 1 && phase < 5}` por `visible={phase >= 1}` (lucro) e `visible={phase >= 3}` (custo). Eles ficam ali estáticos até reload (que já é o comportamento desejado, pois `useInViewOnce` só dispara uma vez).

### 2.2 Mockup flutuando em loop
Envolver o `<PhoneFrame>` (linha 838) com `<div className="hero-float">` (já existe — `heroFloat 6.5s ease-in-out infinite`, mesma vibe da Hero). Sem CSS novo.

### 2.3 Glow animado infinito no card principal
No `KmBoomMockup`, o card `R$/km mínimo agora` hoje ganha `shadow-[...]` só quando `pulse=true`. Trocar por uma nova classe utilitária `km-glow-pulse` aplicada **sempre** (não condicional), com animação infinita pulsando o glow primary. Manter o `pulse` apenas como reforço breve (overlay rápido) ou aposentar — preferimos só a animação contínua.

Adicionar em `HeroStyles`:
```css
.km-glow-pulse {
  box-shadow: 0 0 0 1px hsl(var(--primary)/0.45), 0 0 28px -6px hsl(var(--primary)/0.45);
  animation: kmGlowPulse 2.8s ease-in-out infinite;
}
@keyframes kmGlowPulse {
  0%,100% { box-shadow: 0 0 0 1px hsl(var(--primary)/0.35), 0 0 22px -8px hsl(var(--primary)/0.35); }
  50%     { box-shadow: 0 0 0 1px hsl(var(--primary)/0.65), 0 0 44px -2px hsl(var(--primary)/0.70); }
}
```
E adicionar `.km-glow-pulse` ao `prefers-reduced-motion` (animation: none).

---

## 3. Seção Metas Inteligentes — dinamismo

### 3.1 Transição entre dias + count-up + flutuar + glow
Refatorar `MetasMockup` (linhas 1461–1508) para ser dinâmico:

- Criar 4 "estados de dia" rotativos (Seg→Ter→Qua→Qui), cada um com:
  - `metaAtingida` (varia ~58%, 62%, 67%, 71%) e `metaFaltante` correspondente.
  - `hoje.value` (R$ 290, R$ 305, R$ 280, R$ 315) e `hoje.hint` ("+ 12% vs ontem", "ajustada", "−5% vs ontem", "+ 8% vs ontem").
  - `amanha.value` recalculada (R$ 305, R$ 295, R$ 320, R$ 310).
  - Larguras das 5 barras `Próximos 5 dias` ajustadas levemente.
- `useEffect` com `setInterval` 4.5s alternando o índice (0→1→2→3→0...), com cleanup. Respeita `prefers-reduced-motion` (não roda).
- Usar `AnimatedNumber` (já existe) para todos os valores numéricos (`R$ 8.400`, `faltam R$ 3.480`, `Hoje`, `Amanhã`, valores dos próximos 5 dias) — count-up suave entre estados.
- Largura da barra principal e das 5 mini-barras transicionam com `transition: width 800ms cubic-bezier(0.22,1,0.36,1)`.
- Pequeno "respiro" no card destacado (Hoje) ao trocar de estado: classe utilitária `metas-flash` que dá um `opacity: 0.6 → 1` curtinho ao mudar a key.

- **Mockup flutuando:** envolver o `<PhoneFrame>` dentro do `FeatureSection` em um `<div className="hero-float">`. Como o `FeatureSection` é compartilhado, vamos passar o mockup já envolto em `hero-float` direto do `FeatureMetas`:
  ```tsx
  mockup={<div className="hero-float"><MetasMockup /></div>}
  ```
  (Mas o `FeatureSection` já envolve em `<PhoneFrame>`, então melhor passar o componente Mockup como hoje e adicionar `hero-float` ao wrapper `relative mx-auto w-full max-w-[320px]` em `FeatureSection` linha 1213 — isso afeta também Personalização: ok, todas as mockups vão flutuar como a Hero, mais coerente.)

- **Glow animado por trás:** o `absolute -inset-8 -z-10 rounded-full bg-primary/15 blur-3xl` na linha 1214 ganha a classe `hero-breath` (já existe — `heroBreath 5s scale 1↔1.06`), igualando o "respirar" da Hero.

### 3.2 Reduced motion
Tudo respeitando `@media (prefers-reduced-motion: reduce)` já configurado nas linhas 559–561 (estender o seletor para incluir `.km-glow-pulse, .metas-flash`).

---

## Não tocar
- `useSubscription`, Stripe, Supabase, demais páginas, tema do app real.
- Identidade visual (verde primary, dark mode).
- Estrutura/SEO/`<Header>`/`<Footer>`/`FinalCta`.

## QA
- Desktop 1280: 4 cards flutuantes lendo coerentes com o mockup, sem sobreposição.
- Mobile 375: só o card compacto `R$/KM` continua visível.
- KM Inteligente: rolar até a seção, ver lucro entrar, número descer, custo entrar, número subir, glow do card principal pulsando infinito; após reload, animação repete; cards `Lucro/Custo registrado` ficam visíveis ao final.
- Metas: rolar até a seção, ver números trocando suavemente entre 4 estados em loop, mockup flutuando, glow respirando.
- `prefers-reduced-motion`: nada anima além de transições funcionais.
