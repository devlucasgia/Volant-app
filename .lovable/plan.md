## Objetivo
Corrigir os 3 pontos pendentes sem ampliar escopo:
1. Ajustar os nomes dos remetentes dos emails internos.
2. Integrar o “Alvo + KM restante” no card de R$/km da Home, sem ficar solto.
3. Garantir que o botão “Continuar” do Planejamento Inteligente fique visível no mobile sem exigir scroll.

## O que vou implementar
### 1) Remetentes dos emails
Vou substituir os nomes atuais dos templates pelos nomes aprovados:
- Volant · Novo cadastro
- Volant · Nova assinatura
- Volant · Cancelamento
- Volant · Pagamento falhou

Também vou validar que o cabeçalho `From` continue usando esses rótulos, sem alterar o domínio de envio.

### 2) Home — KM alvo + restante
Hoje essa informação está sendo renderizada como uma linha solta abaixo do card de R$/km.
Vou mover essa informação para dentro do próprio card, como um rodapé discreto e integrado ao bloco principal, com:
- separação visual sutil
- tipografia menor e mais estável
- destaque sóbrio para o estado do ritmo
- sem aparência de “mini-card solto”

### 3) Planejamento Inteligente — botão “Continuar”
Vou corrigir o conflito entre o footer fixo do fluxo e a navegação fixa inferior do app.
Ajuste previsto:
- elevar o footer do fluxo acima da barra inferior
- reservar espaço inferior real para o conteúdo
- manter o CTA sempre acessível no mobile

## Resultado esperado
- Próximos emails chegam com o nome correto do remetente.
- O card de R$/km da Home fica mais sofisticado e coeso.
- O usuário consegue avançar no Planejamento Inteligente sem precisar rolar para revelar o botão.

## Detalhes técnicos
- Email: ajustar os `displayName` dos templates e manter o `from` montado com esse nome.
- Home: editar o bloco do card de KM Inteligente na tela `/app`.
- Planejamento: ajustar `GuidedFlow` e a convivência dele com `BottomNav`/layout fixo.

## Observação sobre créditos
Eu não consigo confirmar, alterar ou prometer cobrança de créditos pelo sistema daqui. Se houve promessa anterior sobre não cobrar, isso precisa ser tratado pelo suporte/plataforma. Da minha parte, vou manter a correção estritamente nesses 3 itens para evitar novo escopo.
