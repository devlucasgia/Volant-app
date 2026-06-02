import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "invalid" | "already" | "success" | "error" | "submitting";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (data?.valid) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) return setState("error");
    if (data?.success) setState("success");
    else if (data?.reason === "already_unsubscribed") setState("already");
    else setState("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Gerenciar inscrição
        </h1>

        {state === "loading" && (
          <p className="text-sm text-muted-foreground">Validando seu link…</p>
        )}

        {state === "valid" && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Confirme abaixo para deixar de receber e-mails do Volant neste endereço.
            </p>
            <Button onClick={confirm} className="w-full">
              Confirmar cancelamento
            </Button>
          </>
        )}

        {state === "submitting" && (
          <p className="text-sm text-muted-foreground">Processando…</p>
        )}

        {state === "success" && (
          <p className="text-sm text-foreground">
            Pronto! Você não receberá mais e-mails neste endereço.
          </p>
        )}

        {state === "already" && (
          <p className="text-sm text-foreground">
            Este endereço já está cancelado.
          </p>
        )}

        {state === "invalid" && (
          <p className="text-sm text-muted-foreground">
            Link inválido ou expirado.
          </p>
        )}

        {state === "error" && (
          <p className="text-sm text-destructive">
            Não foi possível processar agora. Tente novamente em instantes.
          </p>
        )}
      </div>
    </div>
  );
}
