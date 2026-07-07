## Objetivo
Fazer o modal de conquista "Meta do dia batida!" aparecer apenas uma única vez por dia, mesmo que o usuário feche e reabra o aplicativo.

## Comportamento atual
O modal usa `sessionStorage` para guardar a flag `volant_conquest_shown_<yyyy-MM-dd>`. Como `sessionStorage` é limpa ao fechar o app/aba, o modal reaparece toda vez que o app é reaberto.

## Alteração planejada
Trocar `sessionStorage` por `localStorage` nas duas ocorrências do fluxo de conquista em `src/pages/Dashboard.tsx`:

1. `handleConquestClose` — ao fechar/compartilhar o modal, gravar a flag em `localStorage`.
2. `useEffect` que abre o modal — consultar `localStorage` antes de disparar.

A chave continua por dia (`volant_conquest_shown_<yyyy-MM-dd>`), então:
- Se a meta do dia atual já foi batida e o modal foi visto, ele não reaparece no mesmo dia.
- Se o usuário fechar e reabrir o app, a flag persiste e o modal não volta.
- Quando um novo dia atingir a meta, uma nova chave é criada e o modal aparece normalmente.

## Arquivos alterados
- `src/pages/Dashboard.tsx` (somente as duas referências de `sessionStorage` no bloco de conquista)

## O que não muda
- Layout, texto, animação ou visual do `ConquestModal`.
- Lógica de cálculo de meta (`goalReached`, `period === "day"`, `s.gross > 0`).
- Outros fluxos (login, signup, share, onboarding, etc.).
