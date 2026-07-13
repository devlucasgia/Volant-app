## Plano

### Objetivo
Corrigir definitivamente o tour de Ganhos/Gastos removendo a dependência do botão **Próximo** nas etapas dentro do formulário. O tour deve avançar conforme o usuário interage de verdade com os campos.

### Mudanças propostas

1. **Ganhos: avanço 100% por ação no formulário**
   - Horas: ao alterar a roda de horas, o tour avança.
   - KM: ao preencher/alterar KM total, inicial ou final, o tour avança.
   - Valor e corridas: ao preencher valor/corridas de uma plataforma, o tour avança.
   - Adicionar plataforma: ao tocar em adicionar plataforma/criar outra, o tour avança.
   - Salvar: ao salvar ganho, o tour avança para a Home.
   - Na Home, manter ação real no chip Bruto/Líquido para avançar.

2. **Gastos: avanço 100% por ação no formulário**
   - Categoria: ao escolher categoria, o tour avança.
   - Valor: ao preencher valor do gasto, o tour avança.
   - Salvar: ao salvar gasto, o tour avança para a seção “Por gastos”.

3. **Remover/ocultar botão Próximo onde ele causa problema**
   - Etapas do formulário deixarão de mostrar **Próximo**.
   - O balão passa a orientar a ação esperada.
   - Manter **Pular** como escape seguro.
   - Manter **Concluir** apenas em etapas finais informativas, fora do formulário.

4. **Instrumentar ações no `EntryDrawer`**
   - Adicionar `notifyAction(...)` nos pontos certos:
     - `filled-hours`
     - `filled-km`
     - `filled-earning-values`
     - `used-add-platform`
     - `selected-expense-category`
     - `filled-expense-value`
   - Usar pequenos guards para não avançar com campo vazio ou interação acidental.

5. **Revisar scripts dos tours**
   - Atualizar `earningsTourSteps` e `expensesTourSteps` para trocar etapas `advance: "next"` por `advance: "action"` dentro do formulário.
   - Ajustar textos para indicar claramente “faça isso” em vez de “toque em Próximo”.

### Arquivos envolvidos
- `src/lib/tours/earningsTour.ts`
- `src/lib/tours/expensesTour.ts`
- `src/components/EntryDrawer.tsx`
- Possivelmente `src/components/tour/TourOverlay.tsx` apenas para esconder o botão em etapas de ação e manter fallback seguro.

### Resultado esperado
O tour não dependerá mais do botão **Próximo** durante o preenchimento. Ele seguirá o fluxo natural: o usuário preenche/interage, o tour avança sozinho; se sair do contexto, continua protegido pelas travas já implementadas.