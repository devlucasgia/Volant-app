Plano proposto:

1. Corrigir a regra de histórico
- Dias passados sem registro não serão mais classificados automaticamente como “folga”.
- Para meses anteriores, o calendário mostrará apenas fatos registrados:
  - dia com ganho/gasto: valor exibido;
  - dia sem registro: célula neutra, sem “folga”.
- A semântica de planejamento (“folga” / “não trabalhou”) ficará restrita ao mês do plano ativo e, de preferência, apenas para hoje/futuro ou para datas realmente pertencentes ao plano vigente.

2. Evitar vazamento do plano atual para meses antigos
- Ajustar a lógica que hoje usa `planningSelectedDates` em qualquer mês aberto.
- Quando o usuário navegar para um mês diferente do mês do plano ativo, o calendário não usará essas datas para inferir folgas.
- Isso evita que junho, maio etc. sejam reinterpretados com base no plano de julho.

3. Melhorar a apresentação dos valores
- Alterar o formato compacto para incluir `R$`:
  - `R$ 230`
  - `R$ 1,2k`
  - `-R$ 80` ou `R$ -80`, mantendo o padrão mais legível no espaço da célula.
- Manter abreviação quando necessário para não poluir o calendário mobile.

4. Ajustar proporção visual das células
- Aumentar levemente a largura dos dias no `EnrichedCalendar`, mantendo a altura atual ou quase igual.
- Objetivo: voltar a um quadradinho mais uniforme, sem perder a segunda linha de valor.
- Ajustar também cabeçalho da semana e espaçamento das linhas para ficar alinhado no mobile.

5. Aplicar nos dois pontos existentes
- Home: drawer “Selecionar período”.
- Relatórios: drawer “Selecionar período”.
- Preservar filtros, seleção de intervalo e cálculo líquido/bruto já existentes.

Detalhe técnico:
- A correção principal será em `src/lib/calendarDayStats.ts` e `src/components/ui/EnrichedCalendar.tsx`.
- Em `Dashboard.tsx`, o calendário deixará de aplicar semântica de plano fora do mês/plano correto.
- `Reports.tsx` continuará mostrando apenas dados reais, sem folga planejada.