import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Car, Eye, EyeOff } from "lucide-react";
import { friendlyAuthError } from "@/lib/friendlyErrors";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useDocumentMeta({
    title: mode === "signin" ? "Entrar — Volant" : "Criar conta — Volant",
    description: "Acesse o Volant para registrar ganhos, gastos e acompanhar sua performance como motorista.",
    canonicalPath: "/auth",
  });


  const sendReset = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Digite seu e-mail para receber o link.");
      return;
    }
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Enviamos um link de recuperação para seu e-mail.");
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setSendingReset(false);
    }
  };

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(friendlyAuthError(result.error, "Não foi possível entrar com Google. Tente novamente."));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src="/icon-512.png" alt="Logotipo Volant" className="mx-auto mb-3 h-16 w-16 rounded-2xl shadow-elevated" />
          <h1 className="text-2xl font-bold">Volant — Entre ou crie sua conta</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Entre para acessar seus registros" : "Crie sua conta"}
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.32z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continuar com Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">ou com email</span></div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como você quer ser chamado" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={sendReset}
                  disabled={sendingReset}
                  className="text-[12px] text-muted-foreground hover:text-foreground disabled:opacity-60"
                >
                  {sendingReset ? "Enviando..." : "Esqueci minha senha"}
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full gradient-success text-primary-foreground" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>

        <p className="pt-2 text-center text-[11px] text-muted-foreground/70">
          Ao continuar, você concorda com nossos{" "}
          <a href="/termos" className="text-primary hover:underline">Termos</a>
          {" "}e{" "}
          <a href="/privacidade" className="text-primary hover:underline">Política de Privacidade</a>.
        </p>
      </div>
    </div>
  );
}
