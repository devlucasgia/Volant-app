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
import { totalKmAllTime } from "@/lib/stats";
import { num } from "@/lib/format";
import { Moon, Sun, AlertTriangle, LogOut, User as UserIcon, Car } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings, entries, carInitialKm, refreshProfile } = useData();
  const { user, signOut } = useAuth();
  const totalKmDriven = totalKmAllTime(entries);
  const realCurrentKm = carInitialKm + totalKmDriven;

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [carInitialKmInput, setCarInitialKmInput] = useState("");
  const [savingCar, setSavingCar] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url, car_brand, car_model, car_plate, car_initial_km")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
          setAvatarUrl(data.avatar_url || "");
          setCarBrand(data.car_brand || "");
          setCarModel(data.car_model || "");
          setCarPlate(data.car_plate || "");
          setCarInitialKmInput(data.car_initial_km != null ? String(data.car_initial_km) : "");
        }
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName || null,
      avatar_url: avatarUrl || null,
    });
    setSavingProfile(false);
    if (error) return toast.error("Erro ao salvar perfil");
    toast.success("Perfil atualizado!");
  };

  const saveCar = async () => {
    if (!user) return;
    setSavingCar(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      car_brand: carBrand || null,
      car_model: carModel || null,
      car_plate: carPlate || null,
      car_initial_km: parseFloat(carInitialKmInput) || 0,
    });
    setSavingCar(false);
    if (error) return toast.error("Erro ao salvar carro");
    await refreshProfile();
    toast.success("Carro atualizado!");
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

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

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
          <div className="space-y-2">
            <Label>Intervalo (km)</Label>
            <Input
              type="number" inputMode="numeric"
              value={settings.maintenanceIntervalKm}
              onChange={(e) => updateSettings({ maintenanceIntervalKm: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Km total</span>
              <span className="font-semibold tabular-nums">{num(totalKm, 1)} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última manutenção em</span>
              <span className="font-semibold tabular-nums">{num(settings.lastMaintenanceKm, 1)} km</span>
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
    </>
  );
}
