# Publicar o Volant na Play Store

O Volant já é um app instalável (manifest, ícones 192/512, display standalone, tema definido). Isso abre o caminho mais barato e rápido para a Play Store.

## Caminho recomendado: TWA (Trusted Web Activity)

O app publicado (`usevolant.app`) é empacotado dentro de um app Android nativo, gerado com PWABuilder/Bubblewrap. O usuário baixa da Play Store, abre em tela cheia, sem barra de navegador, com ícone e splash próprios. Atualizações de tela e regra de negócio continuam saindo pelo publish do Lovable — sem reenviar APK.

Comparativo:

| | TWA (recomendado) | Capacitor (nativo) |
|---|---|---|
| Custo | US$ 25 (taxa única Google) | US$ 25 + tempo de dev bem maior |
| Prazo | 1 a 2 semanas (a maior parte é revisão da Google) | 3 a 6 semanas |
| Atualizações | Instantâneas via web | Novo build + revisão a cada mudança |
| Qualidade percebida | App real: ícone, splash, tela cheia, offline básico | Idem, com acesso total a hardware |
| Requer Mac/Xcode | Não | Sim para iOS |

Qualidade: sim, é um app real na loja. A diferença prática aparece só se você precisar de recursos nativos profundos (câmera em background, GPS contínuo com app fechado, notificações push nativas). Para o Volant hoje — registro de ganhos/gastos, relatórios, planejamento — o TWA entrega a mesma experiência.

## Ponto crítico: cobrança da assinatura

A Google exige Google Play Billing para venda de conteúdo digital dentro do app. Hoje a assinatura do Volant é Stripe. Três saídas:

1. **Assinatura só fora do app** (mais simples): dentro do app instalado da Play Store, nada de checkout; o usuário assina pelo site. Aprova, mas reduz conversão.
2. **Play Billing via Digital Goods API** no TWA: mantém Stripe na web e usa Play Billing no app. Mais trabalho, comissão de 15% no primeiro US$ 1M.
3. **Publicar como app gratuito com conta já existente**: o usuário se cadastra e assina no site, e o app é apenas o acesso. Variação da 1, com copy pensada para não parecer link de pagamento.

Essa decisão precisa ser tomada antes do empacotamento porque muda o que aparece no app.

## O que eu faço por você

- Ajustar o manifest para os requisitos da Play (id, categorias, screenshots, shortcuts, ícone maskable dedicado).
- Gerar o `assetlinks.json` e publicá-lo em `/.well-known/` no domínio, que é o que valida o TWA e remove a barra do navegador.
- Preparar ícones e as screenshots da ficha da loja (telefone e tablet), nas resoluções exigidas.
- Escrever a ficha da loja em PT-BR: título, descrição curta, descrição completa, palavras-chave.
- Montar a página de política de privacidade no formato que a Google exige (já existe `/privacidade`, falta ajustar itens obrigatórios como exclusão de conta, que é requisito de 2024+ para apps com login).
- Criar a rota pública de exclusão de conta exigida pela Google.
- Adaptar o app para o modo Play (esconder ou ajustar o checkout conforme a decisão de cobrança, detectar se está rodando dentro do TWA).
- Guiar passo a passo o preenchimento do Play Console e o formulário de Segurança de Dados.

## O que só você pode fazer

- Criar a conta de desenvolvedor Google Play (US$ 25, verificação de identidade leva de 1 a 3 dias).
- Rodar o gerador do pacote Android (PWABuilder faz pelo navegador, sem instalar nada) e subir o arquivo no Play Console.
- Guardar a chave de assinatura do app.
- Enviar para revisão e responder à Google se pedirem algo.

## Cronograma realista

| Etapa | Prazo |
|---|---|
| Conta de desenvolvedor + verificação | 1 a 3 dias |
| Preparar app, assetlinks, ícones, ficha, exclusão de conta | 1 a 2 dias de trabalho meu |
| Gerar pacote e subir | algumas horas |
| Revisão da Google (primeiro app costuma demorar mais) | 3 a 7 dias |

Total: normalmente 1 a 2 semanas, com custo de US$ 25.

## Detalhes técnicos

- Empacotamento: Bubblewrap/PWABuilder gerando AAB, `applicationId` no padrão `app.usevolant.twa`.
- Validação de domínio: `public/.well-known/assetlinks.json` com o SHA-256 da chave de assinatura do Play (a Google gera a chave final; o fingerprint sai do Play Console após o primeiro envio, então o arquivo é atualizado nessa etapa).
- Detecção de contexto: `document.referrer.startsWith("android-app://")` para saber que está dentro do TWA e condicionar o que for de cobrança.
- Service worker: hoje o app é manifest-only. Isso é suficiente para o TWA; só adicionamos service worker se você quiser uso offline de fato.
