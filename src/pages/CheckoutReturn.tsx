import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getStripeEnvironment } from "@/lib/stripe";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
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
      if (++tries < 10) setTimeout(poll, 1500);
    };
    poll();
  }, [user]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      {confirmed ? (
        <CheckCircle2 className="h-14 w-14 text-primary" />
      ) : (
        <Loader2 className="h-14 w-14 animate-spin text-primary" />
      )}
      <h1 className="mt-4 text-xl font-bold">
        {confirmed ? "Tudo certo! Bem-vindo ao Volant Premium" : "Confirmando sua assinatura..."}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {confirmed
          ? "Seu teste de 7 dias está ativo. Cobrança automática começa após o trial."
          : "Estamos sincronizando seu pagamento. Isso leva poucos segundos."}
      </p>
      {sessionId && (
        <p className="mt-3 text-[11px] text-muted-foreground/70">Sessão: {sessionId.slice(0, 18)}...</p>
      )}
      <Button asChild className="mt-6">
        <Link to="/">Voltar para o início</Link>
      </Button>
    </div>
  );
}
