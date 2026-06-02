
## Leva 4 — Footer mobile, CTA da seção de recursos e botão WhatsApp

### 1. Footer — tagline encurtada (todas as visualizações)

Trocar o texto da coluna 1 (Brand) de:
> "De motorista, para motoristas. Controle financeiro descomplicado."

para apenas:
> "De motorista, para motoristas."

Nada mais muda no desktop — mesma estrutura de 3 colunas, mesmo selo "🔒 Dados criptografados", mesmo bottom bar.

### 2. Footer — tratamento dedicado para mobile

Hoje no mobile o footer só empilha as 3 colunas centralizadas, com fontes grandes → fica desproporcional (print confirma).

Redesenho mobile (`<md`), mantendo o conteúdo idêntico:

- **Bloco Brand** centralizado e compacto:
  - logo 28px + "Volant" `text-sm font-semibold` na mesma linha
  - tagline `text-xs text-muted-foreground` em 1 linha
  - selo "Dados criptografados" `text-[11px]` com ícone 12px
- **Produto + Suporte** lado a lado em **2 colunas** (`grid-cols-2`) ao invés de empilhados:
  - títulos `text-[10px] uppercase tracking-wider`
  - links `text-[13px]` com `py-1`
  - alinhamento à esquerda dentro de cada coluna, `gap-x-4`
- **Bottom bar**: copyright + "Voltar ao topo" `text-[11px]`, divisor mais sutil

Desktop (`md:`) permanece como está — só a tagline muda.

### 3. CTA na seção "Recursos que trabalham por você" (`SecondaryFeatures`)

Adicionar bloco abaixo dos cards, centralizado:
- **Subtítulo** acima do CTA:
  > "Tudo isso trabalhando em segundo plano enquanto você dirige."
- **Botão CTA primário** (mesmo estilo verde do Hero):
  > "Ativar esses recursos agora →" — link `/auth`
- **Selo "🔒 Dados criptografados"** abaixo do botão (mesmo componente do Hero/KM).

Margens `mt-12 md:mt-16`, container `max-w-xl`, dentro do `useReveal` da seção.

### 4. Botão WhatsApp — Grupo Oficial do Volant

Link: `https://chat.whatsapp.com/LkXphgSVRg53rOVQmBEcP7?s=cl&p=a&mlu=1`  
`target="_blank"` + `rel="noopener noreferrer"`.

**Onde colocar (recomendação):**

- **Header** — ❌ não recomendo: já tem logo + 4 âncoras + Login + "Testar grátis". Adicionar WhatsApp polui e compete com o CTA principal.
- **Footer (coluna Suporte)** — ✅ link discreto com ícone WhatsApp pequeno verde, junto de "Fale com a gente". Sempre acessível, sem disputa com conversão.
- **Bloco "Comunidade" dedicado antes do `FinalCta`** — ✅ destaque principal, dá visibilidade real ao grupo.

**Bloco Comunidade (copy ajustado — grupo é só de avisos dos admins, não conversa entre membros):**
- Eyebrow/ícone WhatsApp verde
- Título: **"Receba novidades e benefícios em primeira mão"**
- Subtítulo: *"Entre no grupo oficial do Volant no WhatsApp e fique por dentro de atualizações, novos recursos, dicas e benefícios exclusivos para motoristas."*
- Botão verde-WhatsApp (`#25D366`): **"Entrar no grupo do WhatsApp →"**
- Card com borda sutil, ícone à esquerda em desktop, empilhado em mobile.

**Footer (coluna Suporte) — link adicional:**
- "💬 Grupo no WhatsApp" como terceiro item, antes de Privacidade/Termos.

**Não adicionar no Header.**

### Arquivos afetados

- `src/pages/Landing.tsx`: `Footer` (tagline + layout mobile + link WhatsApp), `SecondaryFeatures` (CTA novo), novo `CommunityBanner` antes do `FinalCta`.

### Ordem de execução

1. Footer: tagline + redesenho mobile + link WhatsApp na coluna Suporte
2. CTA na seção SecondaryFeatures
3. Bloco Comunidade (WhatsApp) antes do FinalCta
