import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/NumberField";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CarFormDialog } from "@/components/CarFormDialog";
import { CategoryDialog } from "@/components/CategoryDialog";
import { PlatformLogo } from "@/components/PlatformLogo";
import { totalKmAllTime } from "@/lib/stats";
import { num } from "@/lib/format";
import { Moon, Sun, AlertTriangle, LogOut, User as UserIcon, Car, Plus, Pencil, Trash2, CheckCircle2, Wrench, Target, Palette, Database, Tags, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Car as CarType } from "@/types";

export default function SettingsPage() {
  const {
    settings, updateSettings, entries, cars, activeCar, carInitialKm,
    setActiveCar, refreshCars, expenseCategories, earningPlatforms, deleteCategory,
  } = useData();
  const { user, signOut } = useAuth();
  const totalKmDriven = totalKmAllTime(entries);
  const realCurrentKm = carInitialKm + totalKmDriven;

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [carDialog, setCarDialog] = useState<{ open: boolean; car: CarType | null }>({ open: false, car: null });
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });
  const [platDialog, setPlatDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });

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
    if (car.is_active) {
      const next = cars.find((c) => c.id !== car.id);
      if (next) await supabase.from("cars").update({ is_active: true }).eq("id", next.id);
    }
    await refreshCars();
    toast.success("Carro excluído");
  };

  const tryDeletePlatform = async (p: { id?: string; key: string; label: string }) => {
    if (!p.id) return;
    const used = entries.some((e) => e.type === "earning" && e.app === p.key);
    if (used) {
      if (!confirm(`A plataforma "${p.label}" possui ganhos registrados. Excluir mesmo assim manterá os registros antigos com o nome atual. Continuar?`)) return;
    } else {
      if (!confirm(`Excluir "${p.label}"?`)) return;
    }
    await deleteCategory(p.id);
    toast.success("Plataforma excluída");
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

  const widgets = settings.dashboardWidgets;
  const setWidget = (k: keyof typeof widgets, v: boolean) =>
    updateSettings({ dashboardWidgets: { ...widgets, [k]: v } });

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="px-4 pt-4 pb-4">
        <Accordion type="multiple" defaultValue={["profile"]} className="space-y-3">

          {/* Profile */}
          <AccordionItem value="profile" className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold">Perfil</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3">
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
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  {settings.theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span className="text-sm">Modo escuro</span>
                </div>
                <Switch checked={settings.theme === "dark"}
                  onCheckedChange={(v) => updateSettings({ theme: v ? "dark" : "light" })}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Cars */}
          <AccordionItem value="cars" className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <span className="font-semibold">Meus carros</span>
                {cars.length > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{cars.length}</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setCarDialog({ open: true, car: null })}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar carro
              </Button>
              {cars.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Nenhum carro cadastrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {cars.map((c) => (
                    <div key={c.id} className={cn(
                      "rounded-lg border p-3 transition-colors",
                      c.is_active ? "border-primary bg-primary/5" : "border-border"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => !c.is_active && setActiveCar(c.id)} className="flex-1 text-left">
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
                          {!c.is_active && <div className="mt-1 text-[11px] text-primary">Toque para ativar</div>}
                        </button>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCarDialog({ open: true, car: c })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCar(c)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Maintenance config */}
          <AccordionItem value="maint" className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <span className="font-semibold">Manutenção preventiva</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3">
              {activeCar && (
                <div className="text-xs text-muted-foreground">
                  Carro ativo: <span className="font-semibold text-foreground">{carLabel(activeCar)}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>Intervalo (km)</Label>
                <NumberField
                  value={settings.maintenanceIntervalKm || null}
                  onChange={(v) => updateSettings({ maintenanceIntervalKm: v ?? 0 })}
                  decimal={false}
                />
              </div>
              <div className="space-y-2">
                <Label>Última manutenção feita em (km)</Label>
                <NumberField
                  value={settings.lastMaintenanceKm || null}
                  onChange={(v) => updateSettings({ lastMaintenanceKm: v ?? 0 })}
                  decimal={false}
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Earning platforms */}
          <AccordionItem value="plats" className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                <span className="font-semibold">Plataformas de lucro</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-2">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setPlatDialog({ open: true, editing: null })}>
                <Plus className="mr-1 h-4 w-4" /> Nova plataforma
              </Button>
              <div className="space-y-2">
                {earningPlatforms.map((p) => (
                  <div key={p.key} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                    <PlatformLogo platformKey={p.key} label={p.label} hex={p.hex} size="sm" />
                    <div className="flex-1 text-sm font-medium">{p.label}</div>
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => setPlatDialog({ open: true, editing: { id: p.id, key: p.key, label: p.label, emoji: p.emoji, color: p.hex } })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {p.isCustom && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        onClick={() => tryDeletePlatform(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Categories */}
          <AccordionItem value="cats" className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                <span className="font-semibold">Categorias de gasto</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-2">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setCatDialog({ open: true, editing: null })}>
                <Plus className="mr-1 h-4 w-4" /> Nova categoria
              </Button>
              <div className="space-y-2">
                {expenseCategories.map((c) => (
                  <div key={c.key} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md text-base"
                      style={{ backgroundColor: c.hex + "33" }}>{c.emoji}</span>
                    <div className="flex-1 text-sm font-medium">{c.label}</div>
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => setCatDialog({ open: true, editing: { id: c.id, key: c.key, label: c.label, emoji: c.emoji, color: c.hex } })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {c.isCustom && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        onClick={() => c.id && confirm(`Excluir "${c.label}"?`) && deleteCategory(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Goal */}
          <AccordionItem value="goal" className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-semibold">Meta diária</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-2">
              <Label>Valor (R$)</Label>
              <NumberField
                value={settings.dailyGoal || null}
                onChange={(v) => updateSettings({ dailyGoal: v ?? 0 })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Appearance */}
          <AccordionItem value="appearance" className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span className="font-semibold">Aparência</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <LayoutDashboard className="h-3.5 w-3.5" /> Visualizações da tela inicial
              </div>
              {[
                { k: "goal" as const, label: "Meta diária" },
                { k: "stats" as const, label: "Performance (R$/hora, R$/km)" },
                { k: "byApp" as const, label: "Por aplicativo" },
                { k: "byExpense" as const, label: "Por gastos" },
              ].map((w) => (
                <div key={w.k} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm">{w.label}</span>
                  <Switch checked={widgets[w.k]} onCheckedChange={(v) => setWidget(w.k, v)} />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Account & Data */}
          <AccordionItem value="account" className="rounded-2xl border border-border bg-card px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="font-semibold">Conta e dados</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3">
              <Button variant="outline" className="w-full" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sair da conta
              </Button>
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Zona de perigo
                </div>
                <Button variant="destructive" className="w-full" onClick={clearAll}>
                  Apagar todos os meus dados
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <p className="pt-4 text-center text-xs text-muted-foreground">
          Volant · Dados sincronizados na nuvem
        </p>
      </div>

      <CarFormDialog
        open={carDialog.open}
        onOpenChange={(o) => setCarDialog((s) => ({ ...s, open: o }))}
        car={carDialog.car}
      />

      <CategoryDialog
        open={catDialog.open}
        onOpenChange={(o) => setCatDialog((s) => ({ ...s, open: o }))}
        type="expense"
        editing={catDialog.editing}
      />

      <CategoryDialog
        open={platDialog.open}
        onOpenChange={(o) => setPlatDialog((s) => ({ ...s, open: o }))}
        type="earning"
        editing={platDialog.editing}
      />
    </>
  );
}
