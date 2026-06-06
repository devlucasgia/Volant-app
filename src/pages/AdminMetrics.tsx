import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

interface Metrics {
  users: { total: number; newLast7: number; newLast30: number; active7: number; active14: number; active30: number };
  subscriptions: { activeLive: number };
  generatedAt: string;
}

export default function AdminMetrics() {
  const { user, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useDocumentMeta({ title: "Métricas — Volant Admin", description: "Painel interno de métricas.", canonicalPath: "/admin/metrics" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setError("Faça login para acessar."); setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("admin-metrics");
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setMetrics(data as Metrics);
      } catch (e: any) {
        setError(e?.message || "Acesso negado.");
      } finally { setLoading(false); }
    })();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <div className="text-lg font-semibold">Acesso restrito</div>
        <p className="text-sm text-muted-foreground">{error || "Você não tem permissão para acessar esta página."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Métricas Volant</h1>
          <p className="text-xs text-muted-foreground">
            Gerado em {new Date(metrics.generatedAt).toLocaleString("pt-BR")}
          </p>
        </header>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Usuários</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Total" value={metrics.users.total} />
            <Stat label="Novos (7d)" value={metrics.users.newLast7} />
            <Stat label="Novos (30d)" value={metrics.users.newLast30} />
            <Stat label="Ativos (7d)" value={metrics.users.active7} />
            <Stat label="Ativos (14d)" value={metrics.users.active14} />
            <Stat label="Ativos (30d)" value={metrics.users.active30} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Assinaturas (live)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Ativas" value={metrics.subscriptions.activeLive} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString("pt-BR")}</div>
    </Card>
  );
}
