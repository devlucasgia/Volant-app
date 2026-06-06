## Diagnóstico atual

- **Notify de assinatura:** hoje **não está confiável / não há evidência de envio funcionando**. Encontrei assinatura sandbox recente na base, mas **nenhum registro correspondente** no log de e-mails para `new-subscription`, `subscription-canceled` ou `payment-failed-internal`.
- **Infra de e-mail:** o domínio está verificado e a fila automática está ativa, então **o problema não parece ser do domínio nem da esteira principal**.
- **Notify de novos usuários:** há pelo menos **1 envio bem-sucedido** recente, então a infra funciona, mas o fluxo **ainda tem fragilidade de consistência**.
- **Planejamento Inteligente:** o bug de retorno faz sentido com o código atual: o fluxo salva o contexto ao sair para cadastrar carro/custos, mas **nem todas as telas reutilizam esse contexto para voltar automaticamente à rotina**.

## Plano proposto

### 1) Corrigir a notify de assinatura
- Revisar o fluxo completo do evento de assinatura em modo teste.
- Garantir que a rotina de assinatura:
  - dispare o e-mail interno ao suporte,
  - registre sucesso/erro em log,
  - não silencie falhas sem rastreabilidade.
- Validar os cenários principais:
  - nova assinatura,
  - cancelamento,
  - falha de pagamento.
- Testar novamente com assinatura sandbox e confirmar em três pontos:
  - comportamento no app,
  - inbox `suporte@usevolant.com.br`,
  - log de envio.

### 2) Corrigir o retorno da rotina do Planejamento Inteligente
- Preservar o contexto do planejamento ao sair para:
  - **cadastrar carro**,
  - **cadastrar custos do veículo**.
- Fazer essas telas entenderem quando foram abertas “a partir do planejamento”.
- Ao concluir um cadastro com sucesso, retornar automaticamente para a rotina do planejamento:
  - no mesmo passo,
  - com o rascunho preenchido preservado.
- Manter o comportamento atual normal quando o usuário abrir essas telas diretamente pelos Ajustes.

### 3) Corrigir a notify de novos usuários para ficar 100%
- Remover a fragilidade atual de deduplicação prematura.
- Ajustar o fluxo para que uma tentativa que falhe **não bloqueie definitivamente** novos reenvios do mesmo cadastro.
- Melhorar o log de erro para separar:
  - falha ao disparar,
  - falha ao enfileirar,
  - falha ao enviar.
- Validar com cadastro real de teste e checar o e-mail final no suporte.

### 4) Revisão da lógica do Planejamento Inteligente
- Manter a base atual, que está boa conceitualmente:
  - meta mensal,
  - dias planejados,
  - KM médio por dia,
  - custos do veículo,
  - cálculo de meta diária e R$/km.
- Corrigir pontos que hoje podem distorcer o resultado:
  - alinhar melhor o cálculo do que **falta faturar** com o que já foi gasto de fato no mês,
  - evitar divergência entre meta líquida, gastos reais e R$/km restante,
  - tratar melhor meses em que o gasto real ficou acima do previsto.
- Estruturar melhorias priorizadas para MVP comercial:
  1. separar com mais clareza **gastos fixos previstos** vs **gastos reais já lançados**,
  2. recalcular o restante com base no cenário real do mês,
  3. considerar custos variáveis importantes no futuro (principalmente combustível),
  4. abrir espaço para cenários de ritmo (conservador / esperado / forte) sem complicar a UX.

## Entendimento técnico do problema

### Notify de assinatura
- Existe assinatura sandbox salva, então o webhook/processamento chegou ao backend em algum momento.
- Mas não apareceu log de e-mail para os templates de assinatura.
- Isso indica um problema na etapa entre **evento de assinatura** e **enfileiramento/envio do e-mail**.

### Notify de novos usuários
- O fluxo atual marca o usuário como “já notificado” cedo demais.
- Se houver falha no envio nessa primeira tentativa, o sistema pode passar a tratar novas tentativas como duplicadas, mesmo sem o e-mail ter sido entregue.

### Planejamento Inteligente
- O fluxo já envia um `planningResume` ao navegar para telas auxiliares.
- O problema é que a tela de carros e/ou a confirmação de salvamento **não usam esse retorno de forma completa**, então o usuário cai na Central de Veículos e perde a continuidade da rotina.

## Resultado esperado após implementação

- Notify de assinatura funcionando em test mode com confirmação em log e inbox.
- Notify de novos usuários estável, sem falsa deduplicação após erro.
- Cadastro de carro e custos voltando corretamente para o Planejamento Inteligente sem perder o que já foi preenchido.
- Planejamento com lógica mais robusta e um parecer claro do que vale ajustar antes do go-live.