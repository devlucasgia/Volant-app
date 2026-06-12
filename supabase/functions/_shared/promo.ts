// Configuração única da promoção de fim de trial (backend).
// Mantenha sincronizado com src/config/promo.ts.
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
