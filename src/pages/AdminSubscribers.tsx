import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

interface Subscriber {
  user_id: string;
  email: string | null;
  display_name: string | null;
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Trial",
  past_due: "Pendente",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  unpaid: "Não pago",
};

function planLabel(priceId: string) {
  if (priceId.includes("yearly")) return "Anual";
  if (priceId.includes("monthly")) return "Mensal";
  return priceId;
}

export default function AdminSubscribers() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [envFilter, setEnvFilter] = useState<string>("live");

  useDocumentMeta({ title: "Assinantes — Volant Admin", description: "Lista de assinantes.", canonicalPath: "/admin/subscribers" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setError("Faça login para acessar."); setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list_subscribers" } });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setList((data as any).subscribers || []);
      } catch (e: any) {
        setError(e?.message || "Acesso negado.");
      } finally { setLoading(false); }
    })();
  }, [user, authLoading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      if (envFilter !== "all" && s.environment !== envFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (q && !((s.email || "").toLowerCase().includes(q) || (s.display_name || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [list, search, statusFilter, envFilter]);

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
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
          <h1 className="text-2xl font-bold">Assinantes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} de {list.length} assinaturas</p>
        </header>

        <Card className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Buscar por e-mail ou nome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativa</option>
              <option value="trialing">Trial</option>
              <option value="past_due">Pendente</option>
              <option value="canceled">Cancelada</option>
            </select>
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="live">Live</option>
              <option value="sandbox">Sandbox</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum assinante encontrado.</Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const isCanceling = s.status === "canceled" || s.cancel_at_period_end === true;
              const endDate = s.current_period_end
                ? new Date(s.current_period_end).toLocaleDateString("pt-BR")
                : null;
              return (
                <Card key={`${s.user_id}-${s.created_at}`} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{s.email || "(sem e-mail)"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {s.display_name || "—"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{planLabel(s.price_id)}</Badge>
                        <Badge
                          variant={s.status === "active" || s.status === "trialing" ? "default" : "secondary"}
                          className={isCanceling ? "bg-destructive/15 text-destructive" : ""}
                        >
                          {STATUS_LABEL[s.status] ?? s.status}
                        </Badge>
                        {s.environment === "sandbox" && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">test</Badge>
                        )}
                      </div>
                      {endDate && (
                        <div className="text-[11px] text-muted-foreground">
                          {isCanceling ? "Acesso até" : "Próx. cobrança"}: {endDate}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
