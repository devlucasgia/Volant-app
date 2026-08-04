import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Crown, Loader2, ShieldAlert, Trash2, Timer, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { cn } from "@/lib/utils";

interface ManualAccessUser {
  id: string;
  email: string | null;
  display_name: string | null;
  lifetime: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_access_granted: boolean;
  updated_at: string | null;
}

type Mode = "lifetime" | "trial";

/** Dias restantes (arredondado pra cima). Null se não houver trial. */
function daysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export default function AdminAccess() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<ManualAccessUser[]>([]);
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("lifetime");
  const [days, setDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDays, setEditDays] = useState("7");
  const [savingEdit, setSavingEdit] = useState(false);

  useDocumentMeta({
    title: "Acessos — Volant Admin",
    description: "Gerenciar acessos manuais (vitalício e trial).",
    canonicalPath: "/admin/access",
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_manual_access" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setList(((data as any).users || []) as ManualAccessUser[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Acesso negado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("Faça login para acessar.");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const parsedDays = Number(days);
  const daysValid = Number.isFinite(parsedDays) && parsedDays >= 1 && parsedDays <= 365;
  const canGrant = Boolean(email.trim()) && (mode === "lifetime" || daysValid);

  const handleGrant = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    if (mode === "trial" && !daysValid) {
      toast.error("Informe um número de dias entre 1 e 365.");
      return;
    }
    setGranting(true);
    try {
      const body =
        mode === "lifetime"
          ? { action: "grant_lifetime", email: e }
          : { action: "grant_trial_days", email: e, days: parsedDays };
      const { data, error } = await supabase.functions.invoke("admin-users", { body });
      if (error) throw error;
      if ((data as any)?.error) {
        const raw = (data as any).error;
        const msg =
          raw === "user_not_found"
            ? "Usuário não encontrado."
            : raw === "invalid_days"
              ? "Número de dias inválido."
              : raw;
        throw new Error(msg);
      }
      toast.success(
        mode === "lifetime"
          ? "Acesso vitalício concedido."
          : `Trial de ${parsedDays} ${parsedDays === 1 ? "dia" : "dias"} concedido.`,
      );
      setEmail("");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao conceder acesso.");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (u: ManualAccessUser) => {
    const label = u.email || "este usuário";
    if (!confirm(`Remover todo o acesso manual de ${label}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "revoke_access", user_id: u.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Acesso removido.");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao remover acesso.");
    }
  };

  const handleExtend = async (u: ManualAccessUser) => {
    const n = Number(editDays);
    if (!Number.isFinite(n) || n < 1 || n > 365) {
      toast.error("Informe um número de dias entre 1 e 365.");
      return;
    }
    setSavingEdit(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "extend_trial_days", user_id: u.id, days: n },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`+${n} ${n === 1 ? "dia" : "dias"} de trial.`);
      setEditingId(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao estender trial.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleLifetime = async (u: ManualAccessUser) => {
    try {
      if (u.lifetime) {
        // vitalício -> trial de 7 dias
        if (!confirm("Converter vitalício em trial de 7 dias?")) return;
        const r1 = await supabase.functions.invoke("admin-users", {
          body: { action: "revoke_lifetime", user_id: u.id },
        });
        if (r1.error) throw r1.error;
        const r2 = await supabase.functions.invoke("admin-users", {
          body: { action: "extend_trial_days", user_id: u.id, days: 7 },
        });
        if (r2.error) throw r2.error;
        toast.success("Convertido em trial de 7 dias.");
      } else {
        if (!u.email) {
          toast.error("Usuário sem e-mail; não é possível conceder vitalício.");
          return;
        }
        const { data, error } = await supabase.functions.invoke("admin-users", {
          body: { action: "grant_lifetime", email: u.email },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success("Convertido em vitalício.");
      }
      setEditingId(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao converter acesso.");
    }
  };

  const { lifetimeCount, trialActiveCount } = useMemo(() => {
    let l = 0;
    let t = 0;
    for (const u of list) {
      if (u.lifetime) l++;
      else if ((daysLeft(u.trial_ends_at) ?? -1) > 0) t++;
    }
    return { lifetimeCount: l, trialActiveCount: t };
  }, [list]);

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
          <h1 className="text-2xl font-bold">Acessos manuais</h1>
          <p className="text-sm text-muted-foreground">
            Conceda Premium vitalício ou um trial com prazo definido, por e-mail.
          </p>
        </header>

        {/* Conceder */}
        <Card className="p-4">
          <div className="text-sm font-semibold">Conceder acesso</div>

          {/* Segmented de modo */}
          <div className="mt-3 flex gap-4 border-b border-border">
            {(["lifetime", "trial"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "-mb-px pb-2 text-sm transition-colors",
                  mode === m
                    ? "border-b-2 border-primary font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "lifetime" ? "Vitalício" : "Trial"}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={granting}
              className="flex-1"
            />
            {mode === "trial" && (
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                placeholder="Dias"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                disabled={granting}
                className="sm:w-28"
              />
            )}
            <Button onClick={handleGrant} disabled={granting || !canGrant}>
              {granting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "lifetime" ? (
                "Conceder vitalício"
              ) : (
                "Conceder trial"
              )}
            </Button>
          </div>

          {mode === "trial" && !daysValid && days.trim() !== "" && (
            <p className="mt-2 text-xs text-destructive">Informe um número entre 1 e 365.</p>
          )}
          {mode === "trial" && (
            <p className="mt-2 text-xs text-muted-foreground">
              O trial passa a valer imediatamente e reinicia a contagem a partir de hoje.
            </p>
          )}
        </Card>

        {/* Lista */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Acessos concedidos ({list.length}) · {lifetimeCount} vitalício
            {lifetimeCount === 1 ? "" : "s"} · {trialActiveCount} trial
            {trialActiveCount === 1 ? "" : "s"} ativo{trialActiveCount === 1 ? "" : "s"}
          </h2>

          {list.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum acesso manual concedido.
            </Card>
          ) : (
            <div className="space-y-2">
              {list.map((u) => {
                const left = daysLeft(u.trial_ends_at);
                const trialActive = !u.lifetime && left !== null && left > 0;
                const trialExpired = !u.lifetime && left !== null && left <= 0;
                const isEditing = editingId === u.id;

                return (
                  <Card key={u.id} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {u.lifetime ? (
                          <Crown className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Timer
                            className={cn(
                              "h-4 w-4 shrink-0",
                              trialActive ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {u.email || "(sem e-mail)"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {u.display_name ? `${u.display_name} · ` : ""}
                            {u.lifetime
                              ? "Vitalício"
                              : trialActive
                                ? `Trial · ${left} ${left === 1 ? "dia restante" : "dias restantes"}`
                                : trialExpired
                                  ? "Trial expirado"
                                  : "Sem acesso ativo"}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(isEditing ? null : u.id);
                            setEditDays("7");
                          }}
                          aria-label="Editar acesso"
                        >
                          {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(u)}
                          aria-label="Remover acesso"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={365}
                            placeholder="Dias"
                            value={editDays}
                            onChange={(e) => setEditDays(e.target.value)}
                            className="sm:w-28"
                            disabled={savingEdit}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleExtend(u)}
                            disabled={savingEdit}
                          >
                            {savingEdit ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Adicionar dias de trial"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleLifetime(u)}
                            disabled={savingEdit}
                          >
                            {u.lifetime ? "Converter em trial (7 dias)" : "Tornar vitalício"}
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {u.lifetime
                            ? "Este usuário é vitalício. Adicionar dias só terá efeito se ele deixar de ser vitalício."
                            : trialActive
                              ? "Os dias são somados ao prazo atual."
                              : "O trial estava expirado ou inexistente: a contagem começa a partir de hoje."}
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
