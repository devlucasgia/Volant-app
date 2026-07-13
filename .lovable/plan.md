## Ajustes finos no tour de Ganhos e Gastos

### 1. Balão do tour sobrepondo conteúdo ao rolar (Ganhos e Gastos)
**Problema:** Quando o alvo (ex.: campo de valor da plataforma, valor do gasto) está mais para baixo no drawer, o balão do Popover fica encostado no alvo e pode sobrepor conteúdo importante ou ficar cortado.

**Solução em `src/components/tour/TourOverlay.tsx`:**
- Quando `mode === "glow"` (alvo dentro de um drawer), desacoplar o balão do alvo: renderizar o `PopoverContent` numa posição **fixa** no topo do drawer (ou logo abaixo do handle do Vaul), com `side="bottom"` e âncora no topo da viewport (~72px do topo).
- Assim o balão fica "flutuando" no topo do drawer enquanto o glow pulsante continua marcando o campo — o usuário rola o formulário sem o balão viajar junto nem cobrir campos.
- Manter o comportamento atual (âncora no alvo) quando `mode === "spotlight"` (fora de drawer).

### 2. Avanço abrupto ao clicar em "Adicionar plataforma" (Ganhos)
**Problema:** Hoje o tour avança no `onClick` do `SelectTrigger`, antes do usuário ver ou escolher qualquer opção.

**Solução em `src/components/EntryDrawer.tsx` (linhas 620–639):**
- Remover o `notifyAction("used-add-platform")` do `onClick` do `SelectTrigger`.
- Manter apenas dentro do `onValueChange` — ou seja, só avança **depois** que o usuário escolhe uma plataforma (ou "criar nova"), quando o select já fechou.

### 3. Transições mais fluidas entre passos
**Solução em `src/context/TourContext.tsx`:**
- Aumentar o delay do `notifyAction` de 60ms para ~350ms. Dá respiro visual entre o campo preenchido e o próximo balão aparecer, evitando a sensação "atravessada".
- Manter o lock anti-duplo-avanço já existente.

### 4. Tour de Gastos não destaca a seção "Por gastos" na Home
**Problema:** O passo final aponta para `[data-tour="home-expenses-section"]` mas: (a) a seção pode estar fora do viewport e não há scroll automático; (b) o efeito visual precisa ser o mesmo spotlight/blur do herói.

**Solução em `src/components/tour/TourOverlay.tsx`:**
- No `useTargetRect`, quando o alvo é encontrado, chamar `el.scrollIntoView({ block: "center", behavior: "smooth" })` **uma vez** por passo, antes da primeira medição. Aguardar ~350ms e remeasure para obter o rect final.
- O modo `spotlight` já aplica o blur/escurecido em volta com glow pulsante — o mesmo efeito do herói de Ganhos. Basta garantir o scroll para o alvo aparecer.

**Confirmação:** O card único de Ganhos/Gastos na Home já tem `data-tour="home-expenses-section"` (Dashboard.tsx:793), então o seletor está correto. O passo final do `expensesTourSteps` já aponta para ele.

### Arquivos alterados
- `src/components/tour/TourOverlay.tsx` — balão fixo no topo em modo glow + scroll automático até o alvo.
- `src/context/TourContext.tsx` — delay de 350ms no `notifyAction`.
- `src/components/EntryDrawer.tsx` — remover `notifyAction` do `onClick` do trigger "Adicionar plataforma".

### Fora do escopo
- Não mexer em cálculos, dados, RLS, nem em passos que já funcionam.
- Não mudar textos dos tours nem a ordem dos First Steps.
