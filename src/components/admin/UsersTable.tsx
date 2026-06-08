import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Search, Car, Brain, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  status: "free" | "trial" | "premium" | "lifetime";
  plan: string | null;
  last_activity: string | null;
  engagement: { vehicle: boolean; planning: boolean; financial: boolean };
}

const STATUS_STYLE: Record<AdminUser["status"], string> = {
  premium: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  lifetime: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  trial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  free: "bg-zinc-700/40 text-zinc-400 border-zinc-700",
};
const STATUS_LABEL: Record<AdminUser["status"], string> = {
  premium: "Premium",
  lifetime: "Vitalício",
  trial: "Trial",
  free: "Free",
};

const PAGE_SIZE = 10;

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("admin-users-list");
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setUsers((data as any).users || []);
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar.");
      } finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.email || "").toLowerCase().includes(q) ||
      (u.display_name || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div>
          <div className="text-sm font-semibold text-zinc-100">Gerenciamento de usuários</div>
          <div className="text-[11px] text-zinc-500">{filtered.length} de {users.length} usuários</div>
        </div>
        <div className="relative w-64 max-w-full">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 bg-zinc-950 border-zinc-800 text-zinc-100 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
      ) : error ? (
        <div className="p-6 text-center text-xs text-red-400">{error}</div>
      ) : pageData.length === 0 ? (
        <div className="p-10 text-center text-xs text-zinc-500">Nenhum usuário encontrado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-2.5 font-medium">Usuário</th>
                <th className="px-4 py-2.5 font-medium">Cadastro</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Último acesso</th>
                <th className="px-4 py-2.5 font-medium">Engajamento</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-100 truncate max-w-[220px]">{u.email || "(sem e-mail)"}</div>
                    {u.display_name && <div className="text-[10px] text-zinc-500 truncate max-w-[220px]">{u.display_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", STATUS_STYLE[u.status])}>
                      {STATUS_LABEL[u.status]}{u.plan ? ` · ${u.plan}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums">
                    {u.last_activity ? new Date(u.last_activity).toLocaleDateString("pt-BR") : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <EngBadge icon={<Car className="h-3 w-3" />} label="Veículo" active={u.engagement.vehicle} />
                      <EngBadge icon={<Brain className="h-3 w-3" />} label="Planej." active={u.engagement.planning} />
                      <EngBadge icon={<Wallet className="h-3 w-3" />} label="Financ." active={u.engagement.financial} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-zinc-800 p-3 text-[11px] text-zinc-500">
          <div>Página {page + 1} de {totalPages}</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
              disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
              disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EngBadge({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <span
      title={label + (active ? " · ativo" : " · não realizado")}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
        active ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-800/60 text-zinc-600",
      )}
    >
      {icon}
      {label}
    </span>
  );
}
