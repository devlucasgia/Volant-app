import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { friendlyAuthError } from "@/lib/friendlyErrors";

/**
 * Página pública de redefinição de senha.
 *
 * Fluxo:
 * 1. Usuário pede "Esqueci minha senha" em /auth → enviamos e-mail com link
 *    redirecionando para /reset-password (com tokens no hash da URL).
 * 2. Supabase processa os tokens automaticamente e emite um SIGNED_IN
 *    temporário (sessão recovery). Aqui detectamos esse evento e mostramos
 *    o formulário de nova senha.
 * 3. Após salvar, deslogamos a sessão recovery e mandamos pra /auth.
 *
 * Não altera RequireAuth/RequirePremium — esta rota é pública.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Quando o usuário chega pelo link do e-mail, Supabase processa os tokens
    // do hash e dispara PASSWORD_RECOVERY. Liberamos o formulário aí.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Fallback: se já houver sessão (ex.: usuário recarregou), libera também.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida! Entre novamente.");
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dark flex min-h-[100dvh] items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src="/icon-512.png" alt="Volant" className="mx-auto mb-3 h-16 w-16 rounded-2xl shadow-elevated" />
          <h1 className="text-2xl font-bold">Nova senha</h1>
          <p className="text-sm text-muted-foreground">
            {ready
              ? "Defina uma nova senha para sua conta."
              : "Validando seu link de recuperação..."}
          </p>
        </div>

        {ready ? (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full gradient-success text-primary-foreground" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        ) : (
          <div className="grid place-items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/auth", { replace: true })}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Voltar para o login
        </button>
      </div>
    </div>
  );
}
