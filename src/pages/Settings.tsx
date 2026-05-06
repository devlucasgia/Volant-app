import { PageHeader } from "@/components/ui-bits";
import { useData } from "@/context/DataContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { totalKmAllTime } from "@/lib/stats";
import { num } from "@/lib/format";
import { Moon, Sun, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings, entries } = useData();
  const totalKm = totalKmAllTime(entries);

  const resetMaintenance = () => {
    updateSettings({ lastMaintenanceKm: totalKm });
    toast.success("Manutenção registrada!");
  };

  const clearAll = () => {
    if (!confirm("Apagar todos os registros? Esta ação é irreversível.")) return;
    localStorage.clear();
    location.reload();
  };

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="space-y-4 px-4 pt-4">
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

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Zona de perigo
          </div>
          <Button variant="destructive" className="w-full" onClick={clearAll}>
            Apagar todos os dados
          </Button>
        </section>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          DriveFin · Dados salvos localmente no seu dispositivo
        </p>
      </div>
    </>
  );
}
