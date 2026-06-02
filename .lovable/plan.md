# Leva 5 — Ajustes finos WhatsApp/CTA + Revisão pré-lançamento

## 1. Footer — Grupo do WhatsApp em 1º lugar e sem ícone (todas as visualizações)

Em `src/pages/Landing.tsx`, coluna "Suporte" (linhas ~1760-1785):

- Mover "Grupo no WhatsApp" para a **primeira posição** da lista.
- Remover o ícone `MessageCircle` e a cor `#25D366` — deixar idêntico aos outros links (`block py-0.5 transition hover:text-foreground`), preservando `target="_blank"` + `rel="noopener noreferrer"`.
- Ordem final: **Grupo no WhatsApp → Fale com a gente → Privacidade → Termos de uso**.

## 2. CommunityBanner — logo oficial do WhatsApp + alternância de cor

**Logo oficial:** está dentro das Brand Guidelines do WhatsApp usar o ícone/logo oficial em um botão que abre uma conversa/grupo, desde que não seja modificado e não sugira parceria oficial. Sem problema.

- Criar um pequeno componente inline `WhatsAppIcon` no próprio `Landing.tsx` (SVG oficial do "balão com fone"), aceitando `className` para tamanho e cor.
- Usar no badge superior do card (~28px) e no botão (~16-18px).

**Alternância verde/azul (correção):** hoje o banner usa `#25D366` fixo e não acompanha o tema Líquido (verde) ↔ Bruto (azul). Em `CommunityBanner` (linhas 1493-1527), trocar todas as referências `#25D366` pelos tokens:

- Container: borda/fundo do gradiente passam a usar `hsl(var(--accent-now)/...)` (mesma família do `accent-badge`).
- Badge do ícone: `accent-badge` no lugar de `bg-[#25D366]/15 text-[#25D366]`.
- Botão "Entrar no grupo": `accent-cta text-primary-foreground` (mesma classe do CTA do Hero — herda a transição de 700ms).
- O `WhatsAppIcon` herda a cor do container, então acompanha automaticamente.

## 3. CTA "Recursos que trabalham por você" — subtítulo faltante

Em `src/pages/Landing.tsx` (linhas 1481-1483), adicionar o selo **"7 dias grátis. Sem cartão."** entre o botão e o selo "Dados criptografados", igual ao Hero (linhas 540-546). Ordem final:

1. Botão "Ativar esses recursos agora"
2. `✓ 7 dias grátis. Sem cartão.` (`Check` + `accent-text`)
3. `🔒 Dados criptografados` (`Lock` + `accent-text`)

## 4. Revisão geral pré-lançamento (`/` e `/app`)

Para não estourar esta leva, executo a revisão como **Leva 6** logo após aprovar e aplicar os itens 1-3. É um **checklist de QA** que entrego como **relatório** (sem alterar código de cara), classificando cada item em **OK / Atenção / Bloqueador** antes de subir a versão paga.

**Landing (`/`):**
- Hero, SecondaryFeatures, Pricing, FAQ, CommunityBanner, FinalCta, Footer — consistência de spacing, tokens semânticos, sem cores hardcoded fora do design system.
- Performance: scroll listeners, animações, lazy/conditional renders, `content-visibility`.
- SEO: title, meta description, H1 único, alt em imagens, JSON-LD, canonical.
- Links: `/auth`, `/privacidade`, `/termos`, âncoras internas, WhatsApp.

**App (`/app` e rotas protegidas):**
- Home/Dashboard: cards, filtros de período, performance (R$/h, R$/km, médias).
- Histórico: agrupamento por data correta, ícones de apps/categorias.
- Relatórios: ordem dos cards, charts proporcionais, empty states.
- Ajustes: planejamento, veículos, personalização, categorias.
- Auth/Paywall/Premium: `RequireAuth`, `RequirePremium`, trial interno 7 dias, Stripe checkout, `CheckoutReturn`.
- Mobile: BottomNav, FAB, EntryDrawer, safe-area, scroll de formulários.
- Cálculos: divisores zerados, NaN/Infinity, formatação `R$ 0,00` e `DD/MM/YYYY`.
- Edge functions e config: `supabase/config.toml`, secrets, webhooks.

Saída da Leva 6: relatório estruturado + sugestão de Leva 7 só com ajustes necessários antes de upar.

## Arquivos afetados nesta leva (itens 1-3)

- `src/pages/Landing.tsx` (Footer, CommunityBanner, `WhatsAppIcon` inline, bloco CTA do SecondaryFeatures)
