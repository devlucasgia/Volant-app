## Adendo 2 — Botões opcionais viram pill compacto

Alterar 3 botões opcionais em `src/components/planejamento/GuidedFlow.tsx` para que fiquem como pill compacto alinhado à esquerda, sem nenhuma mudança em CTAs primários.

### Mudanças

1. **Botão "Cadastrar veículo"** (estado sem-veículo, linha ~932)
   - Trocar para `variant="ghost"`, `size="sm"`, `className="mt-1 inline-flex w-auto rounded-full border border-border bg-transparent px-4 text-primary font-semibold hover:bg-primary/5"`.
   - Remover `w-full`.

2. **Botão "Cadastrar custos do veículo"** (estado sem-custo, linha ~1089)
   - Trocar para `variant="ghost"`, `size="sm"`, `className="mt-2 inline-flex w-auto rounded-full border border-border bg-transparent px-4 text-primary font-semibold hover:bg-primary/5"`.
   - Remover `w-full`.

3. **Botão "Cadastrar custos fixos"** (sub-box interno, linha ~1162)
   - Trocar para `variant="ghost"`, `size="sm"`, `className="mt-2 inline-flex w-auto rounded-full border border-border bg-transparent px-4 text-primary font-semibold hover:bg-primary/5"`.
   - Remover `w-full`.

### Preservado

- "Continuar" e "Salvar veículo" continuam full-width e como CTAs primários.
- "Pular" permanece inalterado.
- Lógica, `onClick` e textos dos 3 botões não mudam.
- Layout de alinhamento: os pills ficam à esquerda, tamanho do conteúdo.

### Validação

- Visualmente os 3 botões devem aparecer pequenos, com fundo transparente, borda cinza e texto verde semibold, alinhados à esquerda.
- Type-check e build devem passar.