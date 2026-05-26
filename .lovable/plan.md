
# Sprint 1.1B — Hero "Live Demo" + linguagem visual da landing

## Ajustes aprovados pelo usuário

- **OK** seguir com single phone + toggle automático Líquido ↔ Bruto.
- **OK** remover totalmente o "segundo celular azul" decorativo.
- **Cuidado**: NÃO repetir o storytelling verde/azul em toda seção. A troca de paleta é **exclusiva do Hero** (e onde fizer sentido temático). As outras seções mantêm verde como cor dominante.
- **Personalização (seção #3)**: a animação deve evidenciar **ativar/desativar cards** e **reordenar via drag** — não troca de cor.
- **Lançamento de gastos**: anotado para uma sessão futura (não entra na Hero, não entra agora). Vai virar provavelmente uma nova seção "Registre em segundos" depois.

## Escopo desta sprint (Sprint 1.1B)

**Arquivo único alterado: `src/pages/Landing.tsx`**

Mudanças internas:

1. **Hero**
   - Hook local `useHeroMode()` alterna `'liquido' | 'bruto'` a cada **7s** (cross-fade 700ms). Respeita `prefers-reduced-motion` (fica fixo em `liquido`).
   - `HomeMockup` recebe `mode` como prop e troca:
     - Card principal: **LUCRO LÍQUIDO R$ 350,00** (verde) ↔ **FATURAMENTO BRUTO R$ 600,00** (azul)
     - Linha Bruto/Gastos abaixo permanece para reforçar a relação
     - Meta do dia: **Meta líquida R$ 350 / R$ 714 — 49%** (verde) ↔ **Meta bruta R$ 600 / R$ 1.000 — 60%** (azul)
     - R$/KM: **R$/KM INTELIGENTE R$ 2,42** (verde) ↔ **R$/KM BRUTO R$ 4,15** (azul)
     - Grid Performance: mantém igual (neutro)
   - Toggle visível no topo do mockup ("Líquido / Bruto") com pill deslizante sincronizado.
   - `<AnimatedNumber>` faz countup em ~900ms via `requestAnimationFrame` na troca.
   - Barra de meta re-anima `width` 0→alvo a cada troca.
   - Halo atrás do celular: dois `radial-gradient` empilhados (verde + azul) com `opacity` cross-fade pelo `data-mode`.
   - **Floating cards permanecem em verde/neutro** (sem trocar de cor) — atende ao pedido de não saturar o storytelling.

2. **Token de cor**
   - Reutiliza `--goal-gross` (azul já existente em `index.css`) para a paleta Bruto. Zero mudança em `index.css` ou `tailwind.config.ts`.

3. **Remoções**
   - Nada para remover no código atual — o "segundo celular" só aparecia na referência de imagem, não no JSX. Confirmado lendo o arquivo.

## Fora de escopo (próximas sprints)

- **Sprint 1.1C — Seções de diferenciais**: KM Inteligente, Metas, Personalização ganham micro-animações próprias (ponteiro do velocímetro, barra preenchendo no scroll, drag/drop visual no Personalização com cards reordenando e toggle on/off).
- **Sprint 1.1D — Nova seção "Lançamento rápido de gastos"** mostrando o fluxo de adicionar despesa.

## Critérios de aceitação

- Hero alterna sozinho a cada 7s entre verde e azul, suavemente.
- Toggle no mockup se move sincronizado.
- Números fazem countup (não corte seco).
- Barra de meta anima.
- Halo cross-fade verde ↔ azul.
- Floating cards **não** trocam de cor (permanecem em verde/neutro).
- `prefers-reduced-motion`: tudo estático em modo Líquido.
- `/app`, `/auth` e qualquer lógica interna intactos.
- Sem libs novas, sem mudanças em CSS global ou Tailwind config.

## Estimativa

13–19 créditos (mantém o range planejado).
