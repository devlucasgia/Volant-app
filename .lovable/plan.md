Tudo em `src/pages/Landing.tsx` (sem mudança em backend/Stripe). A última parte é resposta, não código.

---

## 1. Hero — cards encostando no mockup, sem sobrepor

Problema atual: cards usam `left-2 / right-2` e em `≥md` (tablet) eles invadem o mockup; no desktop ficam descolados das bordas.

**Estratégia:** posicionar cards relativos à coluna do mockup, ancorados nas bordas do `PhoneFrame` (max-width ~320px), encostando um pouco para fora no desktop e recolhendo no tablet (`md`).

Mudanças:

**Manutenção** (linhas 285–303):
- Classes: `hero-float absolute hidden md:block w-[130px] lg:w-[150px] top-16 md:-left-2 lg:-left-10`
  - Tablet (`md`): largura menor (130px), encostado bem na borda (`-left-2`).
  - Desktop (`lg`): mantém 150px, sai 10px para fora (`-left-10`) — sobrepõe levemente a borda do mockup, sem invadir o título.

**R$/KM Inteligente** (linhas 306–318):
- Classes: `hero-float absolute z-20 hidden md:block top-40 md:-right-2 lg:-right-10`

**Custos do veículo** (linhas 320–344):
- Classes: `hero-float absolute hidden md:block w-[140px] lg:w-[160px] bottom-28 md:-left-2 lg:-left-10`

**Personalização** (linhas 347–374):
- Classes: `hero-float absolute hidden lg:block w-[150px] bottom-4 lg:-right-10`
- **Esconder no tablet** (`hidden lg:block`): no tablet o bottom já fica apertado com o card de R$/KM e a borda do mockup; removendo só esse no `md` os 3 cards restantes acomodam sem sobrepor texto/mockup. No desktop reaparece encostado à direita.

Coluna do texto do hero recebe `relative z-10` para garantir que o card de Custos (que fica à esquerda-baixo) nunca cubra o CTA mesmo em larguras intermediárias.

QA: no viewport do user (973px, tablet) os 3 cards visíveis encostam nas bordas do mockup sem cobrir texto; em ≥1280 os 4 cards aparecem alinhados às bordas com leve transbordo.

---

## 2. Personalização — animação mais lenta e perceptível

`PersonalizacaoMockup` (linhas 1748–1759):
- Trocar `setInterval(..., 2200)` por `setInterval(..., 4200)` — cada cena fica visível ~4.2s.
- Aumentar `transition: transform 600ms` para `transform 900ms cubic-bezier(0.22,1,0.36,1)` e `opacity 400ms` para `opacity 700ms` (linha 1807–1808), para que a desativação fique mais fluida.
- Toast (linha 1841): `transition-opacity duration-500` → `duration-700`.

---

## 3. Rodapé (linhas 1249–1266)

- **3.1** Linha 1256: trocar `"— feito por motoristas, para motoristas."` por `"— De motorista, para motoristas."` (mantém `hidden md:inline`, atinge tablet+desktop).
- **3.2** Wrapper (linha 1252): trocar `flex-col items-start ... md:flex-row md:items-center` por `flex-col items-center text-center ... md:flex-row md:items-center md:text-left`. No mobile tudo centralizado; no desktop volta ao layout horizontal atual.
- **3.3** Adicionar nova linha de contato logo abaixo dos links (dentro do bloco de links da linha 1258, ou como terceira coluna):
  - Acrescentar `<a href="mailto:contato@usevolant.com.br" className="transition hover:text-foreground">Dúvidas? contato@usevolant.com.br</a>` antes do `©` para que apareça em todos os tamanhos.

---

## Não tocar
Stripe, Supabase, lógica do app, demais seções da landing, cores/tema globais, animações já existentes fora de Personalização.

---

## Resposta sobre Stripe (não envolve código)

**1. Já posso testar um pagamento real com meu cartão no ambiente de testes?**

Não da forma que você está pensando. Resumo:

- O **preview do Lovable** (onde estamos trabalhando) está fixo no **ambiente sandbox** da Stripe — ele lê o token `pk_test_...` do `.env.development`. Qualquer pagamento feito aqui é simulado: você só consegue usar cartões de teste (ex.: `4242 4242 4242 4242`, validade futura, CVC 000). Cartão real é recusado.
- Pagamentos reais só rodam em **produção**, na URL publicada (`usevolant.lovable.app` / `usevolant.app`), depois que o "Live" estiver verde no painel de Pagamentos. Aí sim, qualquer cartão real (inclusive o seu) passa de verdade — Stripe cobra do cartão, dinheiro entra na sua conta Stripe e segue para sua conta bancária no payout normal.
- Para "testar com cartão real" sem perder dinheiro de verdade na prática, a recomendação é:
  1. Publicar.
  2. Criar uma assinatura com seu cartão real no plano de menor valor.
  3. **Logo em seguida**, cancelar e estornar pelo painel da Stripe — antes do payout (D+2 geralmente). Você fica só com a taxa da Stripe (~R$ 0,39 + 3,99%).
  
  É o que a maioria faz como "smoke test" antes de divulgar.

**2. Com 5 créditos dá para aceitar o plano anual via boleto?**

Sim, cabe tranquilamente. O que precisa ser feito:

- Habilitar `boleto` como `payment_method_type` no `create-checkout` (edge function) **só para o `priceId` anual**.
- Ajustar a UI do plano anual para avisar: "Pagamento via cartão ou boleto. No boleto, a liberação acontece em até 3 dias úteis após a confirmação."
- Tratar o webhook `checkout.session.async_payment_succeeded` / `async_payment_failed` para ativar/manter a assinatura só depois que o boleto for pago (boleto é assíncrono — a sessão fica `processing` por dias).
- Garantir que mensal continue só com cartão (boleto recorrente mensal vira pesadelo de inadimplência).

Estimativa real: 2–4 créditos. 5 cobre com folga, sem precisar de novo round.

Pix realmente fica para depois — Stripe libera Pix só após histórico mínimo da conta (você confirmou os 60 dias). Quando liberar, é uma mudança pequena (basicamente adicionar `"pix"` no array de métodos).

Quando você confirmar, eu já implemento o boleto na mesma rodada das mudanças visuais acima — ou em uma rodada separada, se preferir manter este sprint só visual.
