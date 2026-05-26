# Plano — Refino de cards clicáveis e visual das subtelas de Ajustes

Escopo 100% visual/presentacional. Sem alterar lógica, rotas, dados, Stripe, Supabase, auth, onboarding, PWA, checkout, landing ou cálculos.

---

## 1. Indicação sutil de interatividade nos cards

Padrão único, aplicado nos cards já clicáveis:

- **Chevron `›`** discreto (`h-4 w-4 text-muted-foreground/70`) no canto direito, com leve translate-x no hover.
- **Glow/borda** ganha presença sutil em `:hover` (borda → `border-primary/30` ou variante de cor do card) e `active:scale-[0.985]`.
- **Transição** `duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`.
- **Cursor pointer** + `focus-visible:ring-2 ring-primary/40` para acessibilidade.

### Onde aplicar

**Home (`Dashboard.tsx`)**
- Card de Meta: adicionar `ChevronRight` discreto no canto direito do header (junto aos valores) + microlabel `Ver meta` opcional em texto `text-[10px] text-muted-foreground/70` ao lado do chevron. Hover/active já existem; reforçar borda contextual.
- Card KM Inteligente: chevron discreto sobreposto à direita (sem quebrar o layout centralizado) + microlabel `Ver cálculo` no `aria-label`. Como o card é estreito, usar apenas chevron visual no canto, sem texto, para não competir com o valor central.

**Ajustes (`Settings.tsx` → `HubRow`)**
- Já possui `ChevronRight`; reforçar `active:scale-[0.985]`, `focus-visible:ring`, e glow no hover (mantendo o que já existe). Sem mudança estrutural.
- Card de Feedback: aplicar o mesmo padrão de microefeito nos dois botões internos (já são `Button outline`, manter).

**Hubs (`Personalizacao.tsx`, `CentralVeiculos.tsx`, `Categorias.tsx`, `PlanejamentoInteligente.tsx`)**
- `HubCard` já tem chevron — apenas padronizar: mesma curva de transição, `active:scale-[0.985]`, `focus-visible:ring`, glow sutil no hover usando a cor temática do ícone (lilás/ciano/etc).

---

## 2. Subtelas de Ajustes — reduzir espaço vazio

Decisão: **manter como rota dedicada** (não migrar para modal/bottom sheet) — migração para Dialog quebraria histórico do navegador, botão voltar nativo e estados internos das subtelas. Aplico a **opção alternativa segura**: compactar visualmente.

Ajustes nos hubs (`Personalizacao.tsx`, `CentralVeiculos.tsx`, `Categorias.tsx`, `PlanejamentoInteligente.tsx`):

- Reduzir `py-6` → `py-4` no container; conteúdo sobe próximo ao header.
- Envolver os HubCards em um wrapper `max-w-md mx-auto` no desktop para não esticarem em telas largas.
- Adicionar leve "intro" opcional (1 linha de hint contextual) só quando o hub tiver ≤3 cards, para a tela não parecer vazia.
- Footer discreto opcional: `<p className="text-center text-[10.5px] text-muted-foreground/60 pt-2">Toque em um item para abrir</p>` — somente nos hubs com 2–3 itens.

Não alterar rotas, navegação, nem comportamento de back.

---

## 3. Microefeitos de toque/hover (resumo técnico)

Classes padronizadas em cards interativos:
```
transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
hover:bg-card/95 hover:border-{tone}/35
active:scale-[0.985]
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-{tone}/40
cursor-pointer
```
Chevron com `group-hover:translate-x-0.5 group-active:translate-x-1`.

---

## 4. Cores dos ícones em Ajustes

Atual → Novo:
- **Central de Veículos**: `bg-cyan-500/10 text-cyan-300` — **mantém**.
- **Personalização**: hoje `text-teal-400` → **lilás suave** `bg-violet-400/10 text-violet-300` (com glow `shadow-[0_0_12px_-6px_currentColor]` já presente). Atualizar também o ícone do header em `Personalizacao.tsx` para manter coerência.
- **Feedback**: hoje `text-violet-300` → **cinza/prata neutro** `bg-slate-400/10 text-slate-300`.
- **Categorias** e **Planejamento Inteligente**: manter (já distintos do violeta/ciano após mudanças acima).

Apenas tokens visuais nos `iconTone` e no header de Personalização.

---

## 5. Arquivos a alterar

- `src/pages/Dashboard.tsx` — chevron + microefeitos nos cards Meta e KM Inteligente.
- `src/pages/Settings.tsx` — trocar `iconTone` de Personalização (lilás) e Feedback (slate); reforçar foco/active no `HubRow`.
- `src/pages/Personalizacao.tsx` — header lilás; compactar padding; mesmo refino no `HubCard`.
- `src/pages/CentralVeiculos.tsx` — compactar padding; refino no HubCard (mantém ciano).
- `src/pages/Categorias.tsx` — compactar padding; refino no HubCard.
- `src/pages/PlanejamentoInteligente.tsx` — compactar padding; refino no HubCard.

Total: 6 arquivos, apenas mudanças visuais.

---

## 6. Garantias de escopo

Nada é alterado em: Stripe/checkout/webhooks/subscription, Supabase/banco/migrations, autenticação, onboarding, lógica Premium, landing `/`, fluxo PWA, Central de Notificações, Líquido/Bruto, Relatórios, Histórico, rotas, navegação, hooks de dados, cálculos. Apenas classes Tailwind, ícones e pequenos elementos visuais (chevron/label).

Aguardando confirmação para executar.