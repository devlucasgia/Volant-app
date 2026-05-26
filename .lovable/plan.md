
# Sprint 1.1C — Bottom nav fiel, mobile mais limpo e tema global Líquido↔Bruto

Tudo continua em **um único arquivo**: `src/pages/Landing.tsx`. Sem mudanças em `/app`, `/auth`, `index.css`, `tailwind.config.ts` ou qualquer lógica interna.

## 1. Bottom nav do mockup igual ao app real

Hoje o `MockBottomNav` mostra `Início / Ganhos / Despesas / Mais` — não é o que o app real tem. Vou refazer pra reproduzir fielmente o `BottomNav.tsx` do app:

- 4 itens: **Início, Histórico, Relatórios, Ajustes** (com os ícones `Home`, `History`, `BarChart3`, `Settings` — mesmos do app).
- Layout `grid-cols-5` com o item Ajustes na coluna 4 (igual ao real), deixando o slot central reservado.
- **FAB central verde com "+"** sobreposto, em gradiente `success`, com sombra/glow verde, ligeiramente elevado acima da barra (igual ao app).
- Item ativo (Início) em verde, demais em muted.
- Tudo permanece **decorativo** (sem onClick reais — é mockup).

Aplico o novo `MockBottomNav` em **todos os mockups** da página (Hero, KM Inteligente, Metas, Personalização, Comparativo) pra ficar consistente.

## 2. Remover o card "Meta 78%" solto no mobile

Linhas 295–301: removo o `FloatingCard` "Meta" que aparece no mobile (`md:hidden`). Mantenho só o card "R$/KM" flutuante no mobile (lado direito) — fica mais limpo, sem elemento órfão embaixo.

Desktop continua com os 4 cards flutuantes como está.

## 3. Tema global sincronizado com o modo Líquido↔Bruto

A ideia funciona muito bem. Implementação:

- **Intervalo aumentado de 7s → 9s** (700ms de cross-fade), pra dar tempo do olho processar a mudança em toda a página.
- O `useHeroMode()` hoje só vive dentro do Hero. Vou movê-lo pro **componente `Landing`** (raiz) e passar o `mode` como prop pra todas as seções **OU** — mais simples e elegante — aplicar `data-hero-mode="liquido" | "bruto"` no `<div>` raiz da página e usar uma classe utilitária local `.accent-mode` que troca a cor via CSS quando o `data-hero-mode` muda.
- Vou criar no `HeroStyles` (CSS local que já existe) variáveis CSS de "accent atual":
  ```css
  [data-hero-mode="liquido"] { --accent-now: var(--primary); --accent-now-fg: var(--primary-foreground); }
  [data-hero-mode="bruto"]   { --accent-now: var(--goal-gross); --accent-now-fg: 0 0% 100%; }
  ```
  Com `transition: color/background-color/border-color/box-shadow 700ms cubic-bezier(.22,1,.36,1)` aplicado nos elementos que devem trocar.
- **O que troca de cor com o modo** (apenas elementos *de destaque*, não tudo — pra não virar discoteca):
  - Badge "DE MOTORISTA, PARA MOTORISTAS" (borda + texto + pontinho).
  - A palavra destacada no headline ("**realmente lucra**") e seu sublinhado.
  - Botão primário CTA "Testar grátis" do header e do Hero (background + glow).
  - Link âncora "Testar grátis" do header.
  - Eyebrows (chips de seção) das seções abaixo: KM Inteligente, Metas, Personalização, Comparativo, FAQ, CTA final.
  - Botões CTA das seções inferiores ("Quero testar", "Começar agora", etc.).
  - Ícones decorativos em destaque dos cards de feature.
  - Linha gradiente sob o headline.
- **O que NÃO troca** (mantém verde fixo, pra preservar identidade):
  - Logo Volant.
  - Bottom nav (item ativo "Início" sempre verde — é o app real).
  - FAB central "+" (sempre verde — é o app real).
  - Cards "Lucro líquido" em comparativos onde verde tem significado semântico ("este é o líquido").
  - Floating cards do Hero (já decidido na sprint anterior).
  - Textos de corpo, ícones de UI utilitários, bordas neutras.
- `prefers-reduced-motion`: fica travado em `liquido` (verde) — sem troca automática, sem transição.

### Como aplicar sem reescrever 800 linhas

Crio uma classe utilitária local `accent-dynamic` no `HeroStyles`:
```css
.accent-dynamic { color: hsl(var(--accent-now)); transition: color .7s cubic-bezier(.22,1,.36,1), background-color .7s, border-color .7s, box-shadow .7s; }
.accent-dynamic-bg { background-color: hsl(var(--accent-now)); ... }
.accent-dynamic-border { border-color: hsl(var(--accent-now) / 0.4); ... }
.accent-dynamic-glow { box-shadow: 0 0 40px -8px hsl(var(--accent-now) / 0.5); ... }
```
E aplico essas classes nos ~10–15 pontos da página listados acima, substituindo `text-primary`, `bg-primary`, `border-primary/40` etc. **apenas** nesses elementos de destaque. Resto da página intacto.

## Fora de escopo

- Animações de Personalização (drag/toggle) — fica pra Sprint 1.1D.
- Nova seção "Lançamento rápido de gastos" — Sprint 1.1E.

## Critérios de aceitação

- Bottom nav do mockup tem 4 ícones (Início/Histórico/Relatórios/Ajustes) + FAB verde central com "+", visualmente igual ao app real.
- Card "Meta 78%" não aparece mais no mobile do Hero.
- A cada 9s a página inteira faz cross-fade verde ↔ azul nos elementos de destaque (CTAs, badges, headline highlight, eyebrows), sem flicker.
- Logo, bottom nav, FAB e textos neutros **não** trocam de cor.
- `prefers-reduced-motion` mantém tudo verde estático.
- `/app` e `/auth` não tocados. Sem libs novas. Sem alterar `index.css`/Tailwind config.

## Estimativa

10–14 créditos.
