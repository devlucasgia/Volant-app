## Sprint — Modal de atualização disponível

### 1. Novo arquivo: `src/config/appVersion.ts`

Constantes da release atual e conteúdo do modal (editável a cada deploy):

```ts
export const APP_VERSION = "1.5";

export const RELEASE_NOTES: { title: string; bullets: string[] } = {
  title: "O Volant ficou melhor",
  bullets: [
    "Planejamento Inteligente redesenhado",
    "Nova tela de Relatórios",
    "Insights Inteligentes",
    "Lance ganhos de várias plataformas de uma vez",
  ],
};

export const APP_VERSION_STORAGE_KEY = "volant_app_version";
```

Observação: NÃO mexer em `src/config/version.ts` (continua sendo a versão semântica usada pelo rodapé). Este arquivo é independente e existe só para alimentar o modal.

### 2. Novo componente: `src/components/UpdateAvailableModal.tsx`

Bottom sheet seguindo o padrão visual já usado no app (`AjustarSheet`): `Sheet` com `side="bottom"`, `rounded-t-3xl`, `bg-background/95`, handle nativo do Radix.

Comportamento:
- `useEffect` no mount: lê `localStorage.getItem(APP_VERSION_STORAGE_KEY)` dentro de try/catch.
- Se valor é `null` (primeiro acesso): grava `APP_VERSION` silenciosamente, não abre.
- Se valor existe e é **diferente** de `APP_VERSION`: abre o sheet.
- Se igual: não faz nada.
- Sem sessionStorage, sem flag de "recusado".

UI:
- Selo verde pequeno no topo: bolinha + `VERSÃO {APP_VERSION}` (`text-success`, fundo `bg-success/10`).
- Título: `RELEASE_NOTES.title` (bold, ~text-xl).
- Lista de bullets com ícone `Check` verde (`text-success`); só renderiza a lista se `bullets.length > 0`.
- Botão primário cheio "Atualizar agora": grava `APP_VERSION` no localStorage **antes** de `window.location.reload()`.
- Botão ghost "Continuar sem atualizar": só fecha o sheet, não grava nada.
- Fechar via overlay/X também só fecha, não grava.

Sem cores vermelhas/amber. Sem dependência de contextos do app.

### 3. Integração: `src/App.tsx`

Adicionar `<UpdateAvailableModal />` uma única vez, no nível raiz dentro de `UIProvider`, ao lado dos outros toasters globais. Não tocar em mais nada.

### Arquivos
- Criar: `src/config/appVersion.ts`, `src/components/UpdateAvailableModal.tsx`
- Editar: `src/App.tsx` (1 import + 1 linha de JSX)

### Fora do escopo
Nenhuma alteração em DataContext, AuthContext, Supabase, hooks, admin, ou outros componentes/UI.
