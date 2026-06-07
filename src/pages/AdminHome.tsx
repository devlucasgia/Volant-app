import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { BarChart3, Crown, Users, Loader2, ShieldAlert } from "lucide-react";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

export default function AdminHome() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useDocumentMeta({ title: "Admin — Volant", description: "Painel interno.", canonicalPath: "/admin" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setAllowed(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setAllowed(!!data);
    })();
  }, [user, authLoading]);

  if (authLoading || allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <div className="text-lg font-semibold">Acesso restrito</div>
        <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const tiles = [
    { to: "/admin/metrics", icon: BarChart3, title: "Métricas", desc: "Usuários, ativos e assinaturas." },
    { to: "/admin/subscribers", icon: Users, title: "Assinantes", desc: "Lista completa de assinaturas." },
    { to: "/admin/access", icon: Crown, title: "Acessos vitalícios", desc: "Conceder ou revogar Premium vitalício." },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Volant Admin</h1>
          <p className="text-sm text-muted-foreground">Painel interno de gerenciamento.</p>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tiles.map((t) => (
            <Link key={t.to} to={t.to}>
              <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:bg-muted/50">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <t.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
