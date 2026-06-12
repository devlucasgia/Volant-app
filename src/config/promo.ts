// Configuração única da promoção de fim de trial.
// Para desligar o cupom (modal in-app + e-mails), basta mudar `enabled` para `false`
// e republicar. Para auto-expirar, preencha `endsAt` com uma data ISO.
export const TRIAL_PROMO = {
  enabled: true,
  couponCode: "PRIMEIROS25",
  discountLabel: "25% off",
  endsAt: null as string | null,
};

export function isPromoActive(now: Date = new Date()): boolean {
  if (!TRIAL_PROMO.enabled) return false;
  if (TRIAL_PROMO.endsAt) {
    const end = new Date(TRIAL_PROMO.endsAt).getTime();
    if (!Number.isNaN(end) && now.getTime() > end) return false;
  }
  return true;
}
