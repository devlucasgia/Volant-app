## Escopo
Ajustes pontuais em Home e no modal de registro. Nenhuma mudança em cálculos, banco, filtros, autenticação ou navegação.

---

### 1) Home — CTA do card de Planejamento sem meta
**Arquivo:** `src/pages/Dashboard.tsx` (linha 509)

Substituir o texto obsoleto `"Defina sua meta mensal em Ajustes"` (mostrado quando `periodGoal.value === 0`) por:

> **"Toque aqui para configurar seu plano"**

O card já é clicável e leva para `/ajustes/planejamento` — só troca de copy. Nada mais muda.

---

### 2) Modal de ganhos/gastos — sem swipe-to-close
**Arquivo:** `src/components/EntryDrawer.tsx` (linha 399)

Passar `dismissible={false}` no `<Drawer>` (vaul aceita nativamente na Root). Assim o drawer não fecha ao arrastar para baixo nem ao clicar fora — só via botão **Cancelar** ou **Salvar**.

Efeitos colaterais: nenhum. O botão Cancelar já chama `onOpenChange(false)`; o Salvar já fecha via `onOpenChange(false)` no fim do submit.

---

### 3) HoursWheel — loop infinito nas horas e nos minutos
**Arquivo:** `src/components/entry/HoursWheel.tsx`

Hoje o `Wheel` renderiza a lista uma vez só, então trava em 0 e em 23 (ou 59).

Implementação (mínima e segura):
- Renderizar a lista de valores **repetida N vezes** (ex.: `N = 20`) e posicionar o scroll inicial no bloco central.
- No `onScroll`, calcular o índice absoluto → converter para valor via `values[idx % values.length]`.
- Quando o scroll se aproxima da borda superior ou inferior (menos de 2 blocos), reposicionar `scrollTop` no bloco central equivalente **sem animação** (`behavior: "auto"`) — o usuário não percebe o "salto" porque os itens são idênticos.
- Manter o snap, a faixa central destacada, o modo "Digitar" (que continua limitado a 0–23 / 0–59) e o respeito a `prefers-reduced-motion`.

Resultado: rolar para cima em `00` continua para `23`; rolar para baixo em `23` continua para `00`. Mesma coisa em minutos (`00` ↔ `59`).

Nada muda na assinatura de props do `HoursWheel`, nem no valor decimal produzido.

---

### 4) EntryDrawer — restaurar receita simples no seletor "Adicionar plataforma"
**Arquivo:** `src/components/EntryDrawer.tsx` (linhas 253, 557)

Hoje `unusedPlatforms` filtra somente `p.type === "ride"`, então plataformas simples (ex.: bônus, quitanda, etc.) não aparecem mais no dropdown "Adicionar plataforma".

**Melhor forma:** manter o fluxo de sessão operacional coeso (KM/horas/rides) e oferecer as receitas simples de forma explícita, sem confundir com a linha de jornada.

Solução escolhida:
- No `SelectContent` do "Adicionar plataforma", separar em **dois grupos** visuais:
  1. **"Plataformas operacionais"** — as `ride` que ainda não foram usadas (comportamento atual).
  2. **"Receitas simples"** — todas as `simple` do `earningPlatforms`, com um badge sutil "Ganho avulso".
- Ao selecionar uma **simples**, em vez de anexar como linha de sessão, o modal muda para o modo receita simples (`setPlatforms([{ ...newRow(key) }])`) — o `isSimple` derivado de `primaryPlatform` já ativa a UI simples existente (linhas 588–611). Se o usuário já tinha algo digitado na sessão, mostrar um `AlertDialog` de confirmação antes de trocar ("A jornada atual será descartada. Continuar?"). Se estiver vazia, troca direto sem confirmar.
- Manter o item "Criar nova plataforma" no fim.

Isso preserva a UX de sessão multi-app e traz de volta o acesso à receita simples sem inflar o fluxo principal.

---

### 5) Investigação — "tela sobe" ao tocar em partes do modal de ganhos
**Arquivo:** `src/components/EntryDrawer.tsx` + `src/hooks/useKeyboardAwareScroll.ts`

Suspeitas verificáveis:
- `useKeyboardAwareScroll` adiciona `paddingBottom = keyboardHeight + 24` quando o teclado aparece; se algum campo dentro do wheel/select dispara foco transitório, o padding é aplicado brevemente e o conteúdo "salta".
- O `HoursWheel` usa botões dentro de um container rolável — em alguns Androids, tocar num botão da roda pode disparar o mecanismo de "scroll into view" do vaul.

Plano de investigação (durante a execução, sem mudar comportamento se não reproduzir):
- Ler `useKeyboardAwareScroll` para confirmar se ele escuta `visualViewport` corretamente (não deve ativar sem teclado real).
- Garantir que os botões do `HoursWheel` tenham `type="button"` (já têm) e que o scroll interno da roda **não** faça bubble para o container do drawer — adicionar `onTouchMove` com `e.stopPropagation()` só no container rolável da roda, se necessário.
- Adicionar `tabIndex={-1}` nos botões internos da roda para evitar foco acidental que dispararia o teclado virtual em campos vizinhos.

Se após esses ajustes conservadores não houver regressão nem eu conseguir reproduzir, deixo apenas as pequenas travas de segurança acima (elas não têm efeito colateral).

---

### 6) PlatformRow — remover travessão do campo Corridas
**Arquivo:** `src/components/entry/PlatformRow.tsx` (linha 121)

Trocar `placeholder="—"` por `placeholder=""` (string vazia). O campo continua numérico, sem valor default, e pronto para o usuário digitar.

---

## Verificação
- Build ok (`bunx tsgo --noEmit`).
- Home: sem meta configurada, card mostra novo texto e continua clicável para `/ajustes/planejamento`.
- Modal: não fecha por arraste nem clique fora; fecha só em Cancelar/Salvar.
- HoursWheel: loop nas horas (23→0 e 0→23) e nos minutos (59→0 e 0→59).
- Dropdown "Adicionar plataforma" mostra as receitas simples e permite alternar o modo do formulário.
- Campo Corridas aparece em branco (sem travessão).

## O que NÃO muda
Cálculos, filtros, agrupamento de datas, timezone, DataContext, autenticação, banco, layout geral do drawer, submit, drafts.
