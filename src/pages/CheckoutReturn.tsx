import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getStripeEnvironment } from "@/lib/stripe";

export default function CheckoutReturn() {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let tries = 0;
    const env = getStripeEnvironment();
    const poll = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && ["active", "trialing", "past_due"].includes(data.status as string)) {
        setConfirmed(true);
        return;
      }
      if (++tries < 12) setTimeout(poll, 1500);
    };
    poll();
  }, [user]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col items-center">
        {confirmed ? (
          <div className="grid h-16 w-16 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-[0_0_28px_hsl(var(--primary)/0.4)]">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        ) : (
          <Loader2 className="h-14 w-14 animate-spin text-primary" />
        )}
        <h1 className="mt-5 text-xl font-bold">
          {confirmed ? "Tudo certo! Seu teste de 7 dias está ativo." : "Confirmando sua assinatura..."}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {confirmed
            ? "Aproveite todos os recursos Premium do Volant."
            : "Estamos sincronizando seu pagamento. Isso leva poucos segundos."}
        </p>
        <Button asChild className="mt-6 gradient-success text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.3)]">
          <Link to="/">Continuar para o app</Link>
        </Button>
      </div>
    </div>
  );
}
