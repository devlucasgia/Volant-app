import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Crown, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

interface Granted {
  id: string;
  email: string | null;
  display_name: string | null;
  granted_at: string | null;
}

export default function AdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<Granted[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta({ title: "Acessos — Volant Admin", description: "Gerenciar acessos vitalícios.", canonicalPath: "/admin/access" });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list_grandfathered" } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setList((data as any).users || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Acesso negado.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setError("Faça login para acessar."); setLoading(false); return; }
    load();
  }, [user, authLoading]);

  const handleGrant = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "grant_lifetime", email: e },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        const msg = (data as any).error === "user_not_found" ? "Usuário não encontrado." : (data as any).error;
        throw new Error(msg);
      }
      toast.success("Acesso vitalício concedido.");
      setEmail("");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao conceder acesso.");
    } finally { setGranting(false); }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm("Revogar acesso vitalício deste usuário?")) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "revoke_lifetime", user_id: userId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Acesso revogado.");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao revogar.");
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <div className="text-lg font-semibold">Acesso restrito</div>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
          <h1 className="text-2xl font-bold">Acessos vitalícios</h1>
          <p className="text-sm text-muted-foreground">Conceda ou revogue acesso Premium vitalício por e-mail.</p>
        </header>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">Conceder acesso</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={granting}
            />
            <Button onClick={handleGrant} disabled={granting || !email.trim()}>
              {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conceder vitalício"}
            </Button>
          </div>
        </Card>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Com acesso vitalício ({list.length})
          </h2>
          {list.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum usuário com acesso vitalício.
            </Card>
          ) : (
            <div className="space-y-2">
              {list.map((u) => (
                <Card key={u.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Crown className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{u.email || "(sem e-mail)"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.display_name ? `${u.display_name} · ` : ""}
                        desde {u.granted_at ? new Date(u.granted_at).toLocaleDateString("pt-BR") : "—"}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(u.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
