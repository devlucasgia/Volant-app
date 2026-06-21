Plano de implementação para esta sprint pontual:

1. Corrigir definitivamente o alinhamento dos filtros
- Ajustar o `Segmented` no modo `flat`, que hoje força `justify-start`; ele passará a centralizar o grupo de abas por padrão.
- Preservar a largura real dos botões, sem `flex-1`, para não esticar os textos.
- Manter os filtros das outras telas com o mesmo tamanho atual, mudando apenas o alinhamento visual para centro.
- Corrigir o filtro da Home separadamente: hoje o calendário usa `ml-auto`, empurrando os tabs para a esquerda. Vou remover essa causa e centralizar somente o grupo `Hoje / Semana / Mês`, mantendo o ícone de calendário à direita.
- Diminuir apenas as palavras da Home (`Hoje`, `Semana`, `Mês`) em 20%, mantendo os demais filtros exatamente no tamanho atual.

2. Ajustar Organização de Cards e demais filtros flat
- Como a Organização de Cards usa o mesmo `Segmented` flat, ela herdará a centralização correta.
- Validar também os filtros de Relatórios e Histórico que usam esse mesmo componente.
- Não tocar em DnD, ordem dos cards, filtros de dados, queries ou comportamento de clique.

3. Adicionar suporte a veículo elétrico / kWh em Custos Variáveis
- Acrescentar a opção `Elétrico` no tipo de combustível/energia.
- Atualizar os textos do bloco conforme o tipo selecionado:
  - Combustão/flex: `Consumo (km/L)` e `Preço do litro`.
  - Elétrico: `Consumo (km/kWh)` e `Preço do kWh`.
- Reutilizar os campos existentes (`fuel_consumption_kml`, `fuel_price`, `fuel_type`) para evitar alteração estrutural de tabela.
- Atualizar os tipos TypeScript para aceitar o novo valor.
- Como já existe uma restrição no banco para `fuel_type`, aplicar uma migração mínima apenas para permitir o novo valor, sem criar tabela/campo novo e sem mexer em dados existentes.

4. Impacto em planejamento, relatórios e cálculos
- Planejamento inteligente: o cálculo atual já usa `km planejado / consumo × preço`; isso funciona tanto para litro quanto para kWh. Vou apenas ajustar o rótulo do item calculado para `Energia estimada` quando o tipo for elétrico e manter `Combustível estimado` nos demais casos.
- Relatórios: não há cálculo direto baseado em `fuel_type`; os relatórios continuam usando os lançamentos reais de ganhos/gastos. Sem alteração de lógica.
- Smart KM: permanece intacto, pois usa custos fixos/manutenção e não deve receber custos variáveis, conforme regra já aprovada.

5. Validação obrigatória
- Verificar visualmente no mobile se os filtros estão centralizados de verdade:
  - Home: `Hoje / Semana / Mês` centralizados, calendário preservado à direita, texto 20% menor só na Home.
  - Organização de Cards: `Tela inicial / Relatórios` centralizados.
  - Relatórios/Histórico: filtros flat centralizados sem alteração de tamanho.
- Verificar no formulário de Custos Variáveis se `Elétrico` aparece e se os labels mudam para `km/kWh` e `Preço do kWh`.
- Não alterar planningEngine estruturalmente, queries, DataContext, DnD, AuthContext, Admin ou demais cards.