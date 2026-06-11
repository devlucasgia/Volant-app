# Estabilização PWA + UX Silenciosa

## Fase 1 — Validação de escopo (divergências encontradas)

Antes do código, alguns ajustes ao briefing original:

1. **QueryClient não está em `main.tsx`.** Está em `src/App.tsx` (linhas 52-59). `refetchOnWindowFocus: false` e `refetchOnReconnect: false` já existem. Faltam `refetchOnMount: false` e ampliar o `staleTime` (hoje 60s) para 5min.
2. **`useDraftPersistence` usa `sessionStorage`, não `localStorage`.** Isso é proposital (motorista pode usar celular compartilhado / valores sensíveis) e está consistente com a memória do projeto. Vou manter `sessionStorage` — o efeito prático é o mesmo (sobrevive a troca de aba/volta do app), só não persiste após fechar o navegador. Se você quiser mudar para `localStorage` mesmo assim, me avise.
3. **`CarFormDialog.tsx` e `CategoryDialog.tsx` NÃO usam `useDraftPersistence`.** Eles têm estado local que reseta no `useEffect([open, …])`. Não há cache para limpar neles — então não há nada a fazer. Os únicos formulários que realmente persistem rascunho hoje são `EntryDrawer` e `GuidedFlow` (planejamento). Vou focar a limpeza explícita do `clearDraft()` nesses dois.
4. **Sobre o toast "Rascunho restaurado":** existe em `EntryDrawer.tsx:157` e `GuidedFlow.tsx:158`. Ambos serão removidos.

## Fase 2 — Implementação

### A. `src/App.tsx` — QueryClient global
```ts
defaultOptions: {
  queries: {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  },
}
```

### B. `src/components/EntryDrawer.tsx`
- Remover o `toast("Rascunho restaurado", …)` (linha 157).
- Garantir que `onOpenChange(false)` (cancelar/fechar/overlay) chame `draftRef.clear()`. Hoje só limpa em sucesso/`reset()` chamado no submit. Vou interceptar o `onOpenChange` do Drawer raiz: se `open === false` e não houve submit bem-sucedido, chamar `draftRef.clear()`. Mantemos o salvamento automático no `onChange` intacto.
- A hidratação já ocorre uma única vez por abertura via `restoredOnceRef` — isso atende ao requisito de "apenas no mount do formulário". Não muda.

### C. `src/components/planejamento/GuidedFlow.tsx`
- Remover o `useEffect` que dispara `toast("Rascunho restaurado", …)` (linhas 155-163).
- Garantir `planningDraft.clear()` em todos os caminhos de cancelamento: `onCancel` (já existe), e também quando o usuário fecha o sheet sem concluir. Conferir os handlers já presentes — adicionar `.clear()` onde estiver faltando.

### D. `useDraftPersistence.ts`
- Já expõe `clear()` (equivalente a `clearDraft`). Sem mudanças no hook.
- Adicionar comentário curto reforçando: "Hidratação deve acontecer no mount; nunca em listeners de foco/visibility."

## Arquivos impactados
- `src/App.tsx`
- `src/components/EntryDrawer.tsx`
- `src/components/planejamento/GuidedFlow.tsx`
- `src/hooks/useDraftPersistence.ts` (apenas comentário)

## Blindagem
- Sem mudanças em rotas, Supabase, lógica de cálculo, ou em `CarFormDialog`/`CategoryDialog`.
- Salvamento automático de rascunho permanece (apenas silencioso).

## Critérios de aceite
- Voltar de outra aba/app não dispara refetch visível.
- Cancelar/fechar EntryDrawer e GuidedFlow limpa o rascunho imediatamente.
- Nenhum toast de restauração aparece.

## Fase 3 — Relatório final
Ao concluir, entrego: causa raiz, lista de arquivos, resumo da solução e status dos critérios.
