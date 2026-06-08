import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Users, Activity, Crown, DollarSign, LogOut } from "lucide-react";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { KpiCard } from "@/components/admin/KpiCard";
import { SignupsChart } from "@/components/admin/SignupsChart";
import { ConversionChart } from "@/components/admin/ConversionChart";
import { UsersTable } from "@/components/admin/UsersTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";

interface Metrics {
  users: { total: number; newCurrent: number; newPrev: number; activeCurrent: number; activePrev: number; active7: number; active30: number };
  subscriptions: { activeLive: number };
  mrr: { current: number; prev: number };
  conversion: { free: number; trial: number; premium: number };
  signupsSeries: { date: string; count: number }[];
  generatedAt: string;
}

const RANGES: { value: string; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "1y", label: "1 ano" },
];

function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

export default function AdminMetrics() {
  const [range, setRange] = useState("30d");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta({ title: "Métricas — Volant Admin", description: "Painel interno de métricas.", canonicalPath: "/admin/metrics" });

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("admin-metrics", { body: { range } });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setMetrics(data as Metrics);
      } catch (e: any) { setError(e?.message || "Falha ao carregar."); }
      finally { setLoading(false); }
    })();
  }, [range]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  const totalConv = metrics ? metrics.conversion.free + metrics.conversion.trial + metrics.conversion.premium : 0;
  const convRate = totalConv > 0 && metrics ? ((metrics.conversion.premium / totalConv) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300">
              <ArrowLeft className="h-3 w-3" /> Admin
            </Link>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Métricas</h1>
              {metrics && (
                <div className="text-[10px] text-zinc-500">
                  Atualizado {new Date(metrics.generatedAt).toLocaleTimeString("pt-BR")}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    range === r.value ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}
              className="h-8 border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
        ) : error ? (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">{error}</div>
        ) : metrics ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Usuários totais"
                value={metrics.users.total.toLocaleString("pt-BR")}
                icon={<Users className="h-4 w-4" />}
                delta={pctDelta(metrics.users.newCurrent, metrics.users.newPrev)}
                deltaLabel={`+${metrics.users.newCurrent} no período`}
              />
              <KpiCard
                label="Usuários ativos"
                value={metrics.users.active30.toLocaleString("pt-BR")}
                icon={<Activity className="h-4 w-4" />}
                delta={pctDelta(metrics.users.activeCurrent, metrics.users.activePrev)}
                deltaLabel={`MAU · DAU7: ${metrics.users.active7}`}
              />
              <KpiCard
                label="Assinantes Premium"
                value={metrics.subscriptions.activeLive.toLocaleString("pt-BR")}
                icon={<Crown className="h-4 w-4" />}
                deltaLabel={`Conversão: ${convRate}%`}
              />
              <KpiCard
                label="MRR estimado"
                value={brl(metrics.mrr.current)}
                icon={<DollarSign className="h-4 w-4" />}
                delta={pctDelta(metrics.mrr.current, metrics.mrr.prev)}
                deltaLabel="vs período anterior"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SignupsChart data={metrics.signupsSeries} />
              </div>
              <ConversionChart {...metrics.conversion} />
            </div>

            {/* Users table */}
            <UsersTable />
          </>
        ) : null}
      </main>
    </div>
  );
}
