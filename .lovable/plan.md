## O que descobri reproduzindo

Cliquei em **"Continuar com Google"** no Preview (`https://id-preview--185df6ff-9e46-459a-a25d-323f7411f3f9.lovable.app/auth`) e o navegador foi redirecionado para:

```
https://lovable.dev/auth-bridge?project_id=...&return_url=https://id-preview--.../auth
```

…que por sua vez exigiu login na conta Lovable e jogou para `https://lovable.dev/login`. É exatamente nesse ponto que o fluxo trava e a UI mostra **"Falha ao entrar com Google"**.

Em paralelo, conferi os logs de Auth do backend: o seu último login Google **bem-sucedido** veio do referer `https://usevolant.lovable.app` (URL publicada). Não há nenhum login Google partindo do `id-preview--...` — eles falham antes de chegar no Supabase.

## Causa real

O Google OAuth gerenciado pelo Lovable Cloud usa um "auth-bridge" hospedado em `lovable.dev`. Esse bridge:

1. Requer **sessão ativa do dono do projeto em `lovable.dev`** no mesmo navegador.
2. Depende de **cookies de terceiros para `lovable.dev`** estarem permitidos.
3. Funciona normalmente no domínio publicado (`usevolant.lovable.app`, `usevolant.app`) porque ali o redirecionamento ocorre na própria origem do app.

No domínio do Preview (`id-preview--...lovable.app`), o bridge é cross-origin em relação ao `lovable.dev`, então qualquer um destes quebra:

- Sessão Lovable expirada/encerrada no navegador.
- Bloqueio de cookies de terceiros (Brave, Safari ITP, modo anônimo, extensões de privacidade).
- Abrir o Preview em janela anônima/outro perfil sem estar logado em `lovable.dev`.

Isso bate com o cenário que você descreveu: "tinha entrado, mas agora voltou a falhar" — clássico de sessão Lovable expirando ou cookies sendo limpos.

## Por que NÃO vou mexer no código

- O código em `src/pages/Auth.tsx` segue o padrão correto (`lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`).
- O mesmo código funciona em produção (logs confirmam).
- A URL de Preview é gerenciada pelo sistema e **não pode** ser adicionada manualmente no allowlist do Google (você já viu o erro "System-managed URLs cannot be added manually").
- Mexer em `redirect_uri`, provider ou config do Supabase iria **quebrar produção** sem resolver o Preview.

## O que fazer agora (sem alterar código)

Para validar a Sprint no Preview com Google, na ordem de menor esforço:

1. **Faça login em `https://lovable.dev`** no mesmo navegador/perfil onde está abrindo o Preview, depois recarregue a Preview e tente o Google de novo.
2. **Permita cookies de terceiros para `lovable.dev`** nas configurações do navegador (ou desative bloqueios de rastreamento/extensões só para esse domínio).
3. **Não use janela anônima** para testar Google no Preview.
4. **Alternativa imediata para validar a Sprint:** entre no Preview por **email + senha** (esse fluxo não passa pelo auth-bridge e funciona normalmente) e teste tudo. Use o Google só no domínio publicado, onde já está confirmado que funciona.

## Caso queira mesmo um diagnóstico mais profundo

Posso, **só se você autorizar**, fazer uma alteração mínima e temporária em `src/pages/Auth.tsx` para logar `result.error` no console e exibir a mensagem real no toast — assim conseguimos ver se é "popup_closed", "third_party_cookies_blocked", "session_expired" etc. Reverto depois. Mas, pelo padrão do erro e pelos logs, tenho alta confiança de que é o item 1 ou 2 acima.

## Resumo técnico

- **Sintoma:** toast "Falha ao entrar com Google" no Preview.
- **Origem:** `lovable.auth.signInWithOAuth("google")` → redireciona para `lovable.dev/auth-bridge` → este redireciona para `lovable.dev/login` (sessão Lovable ausente/expirada ou cookie 3rd-party bloqueado) → callback nunca volta para o app → `result.error` setado → toast disparado.
- **Produção:** OK (login Google de `usevolant.lovable.app` registrado nos auth_logs com status 200).
- **Backend (Lovable Cloud):** saudável, sem incidente.
- **Ação no código:** nenhuma necessária.
