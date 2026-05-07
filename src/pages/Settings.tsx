import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CarFormDialog } from "@/components/CarFormDialog";
import { totalKmAllTime } from "@/lib/stats";
import { num } from "@/lib/format";
import { Moon, Sun, AlertTriangle, LogOut, User as UserIcon, Car, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Car as CarType } from "@/types";

export default function SettingsPage() {
  const { settings, updateSettings, entries, cars, activeCar, carInitialKm, setActiveCar, refreshCars } = useData();
  const { user, signOut } = useAuth();
  const totalKmDriven = totalKmAllTime(entries);
  const realCurrentKm = carInitialKm + totalKmDriven;

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [carDialog, setCarDialog] = useState<{ open: boolean; car: CarType | null }>({ open: false, car: null });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
          setAvatarUrl(data.avatar_url || "");
        }
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, display_name: displayName || null, avatar_url: avatarUrl || null,
    });
    setSavingProfile(false);
    if (error) return toast.error("Erro ao salvar perfil");
    toast.success("Perfil atualizado!");
  };

  const deleteCar = async (car: CarType) => {
    if (!confirm(`Excluir o carro ${car.brand || ""} ${car.model || ""}?`)) return;
    const { error } = await supabase.from("cars").delete().eq("id", car.id);
    if (error) return toast.error("Erro ao excluir");
    // if it was active, activate another
    if (car.is_active) {
      const next = cars.find((c) => c.id !== car.id);
      if (next) await supabase.from("cars").update({ is_active: true }).eq("id", next.id);
    }
    await refreshCars();
    toast.success("Carro excluído");
  };

  const resetMaintenance = () => {
    updateSettings({ lastMaintenanceKm: realCurrentKm });
    toast.success("Manutenção registrada!");
  };

  const clearAll = async () => {
    if (!confirm("Apagar todos os seus registros? Esta ação é irreversível.")) return;
    if (!user) return;
    const { error } = await supabase.from("entries").delete().eq("user_id", user.id);
    if (error) return toast.error("Erro ao apagar dados");
    toast.success("Dados apagados");
    location.reload();
  };

  const carLabel = (c: CarType) => {
    const parts = [c.brand, c.model].filter(Boolean).join(" ");
    return parts || "Carro sem nome";
  };

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="space-y-4 px-4 pt-4">
        {/* Profile */}
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-primary/15 text-primary"><UserIcon className="h-6 w-6" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{displayName || "Sem nome"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>URL do avatar (opcional)</Label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} className="w-full">
            {savingProfile ? "Salvando..." : "Salvar perfil"}
          </Button>
        </section>

        {/* Cars */}
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Meus carros</h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCarDialog({ open: true, car: null })}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>

          {cars.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhum carro cadastrado.
            </div>
          ) : (
            <div className="space-y-2">
              {cars.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    c.is_active ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => !c.is_active && setActiveCar(c.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{carLabel(c)}</div>
                        {c.is_active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                            <CheckCircle2 className="h-3 w-3" /> ATIVO
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {c.plate ? `${c.plate} · ` : ""}{num(c.initial_km, 0)} km iniciais
                      </div>
                      {!c.is_active && (
                        <div className="mt-1 text-[11px] text-primary">Toque para ativar</div>
                      )}
                    </button>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => setCarDialog({ open: true, car: c })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        onClick={() => deleteCar(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <span className="font-semibold">Modo escuro</span>
            </div>
            <Switch
              checked={settings.theme === "dark"}
              onCheckedChange={(v) => updateSettings({ theme: v ? "dark" : "light" })}
            />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold">Meta diária</h2>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number" inputMode="decimal"
              value={settings.dailyGoal}
              onChange={(e) => updateSettings({ dailyGoal: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold">Manutenção preventiva</h2>
          {activeCar && (
            <div className="text-xs text-muted-foreground">
              Carro ativo: <span className="font-semibold text-foreground">{carLabel(activeCar)}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>Intervalo (km)</Label>
            <Input
              type="number" inputMode="numeric"
              value={settings.maintenanceIntervalKm}
              onChange={(e) => updateSettings({ maintenanceIntervalKm: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Km atual do carro</span>
              <span className="font-semibold tabular-nums">{num(realCurrentKm, 1)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Km rodados no app</span>
              <span className="font-semibold tabular-nums">{num(totalKmDriven, 1)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última manutenção em</span>
              <span className="font-semibold tabular-nums">{num(settings.lastMaintenanceKm || carInitialKm, 1)} km</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={resetMaintenance}>
            Marcar manutenção feita agora
          </Button>
        </section>

        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair da conta
        </Button>

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Zona de perigo
          </div>
          <Button variant="destructive" className="w-full" onClick={clearAll}>
            Apagar todos os meus dados
          </Button>
        </section>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Volant · Dados sincronizados na nuvem
        </p>
      </div>

      <CarFormDialog
        open={carDialog.open}
        onOpenChange={(o) => setCarDialog((s) => ({ ...s, open: o }))}
        car={carDialog.car}
      />
    </>
  );
}
