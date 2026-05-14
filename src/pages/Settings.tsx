import { useEffect, useMemo, useState } from "react";
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
import {
  Moon, Sun, AlertTriangle, LogOut, User as UserIcon, Car, Plus, Pencil, Trash2,
  CheckCircle2, Wrench, Target, Palette, Database, Tags, LayoutDashboard, Loader2,
  KeyRound, Type, ChevronRight, MessageSquare, Bug, Lightbulb,
} from "lucide-react";
import { BugReportDialog } from "@/components/account/BugReportDialog";
import { SuggestionDialog } from "@/components/account/SuggestionDialog";
import { APP_NAME, APP_VERSION_LABEL } from "@/config/version";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Car as CarType, DashboardWidgets } from "@/types";
import { PasswordChangeDialog } from "@/components/account/PasswordChangeDialog";
import { FontSizeSheet } from "@/components/account/FontSizeSheet";
import { useFontScale, FONT_SCALE_OPTIONS } from "@/lib/fontScale";
import { friendlyDbError } from "@/lib/friendlyErrors";

interface DraftSettings {
  dailyGoal: number;
  maintenanceIntervalKm: number;
  lastMaintenanceKm: number;
  dashboardWidgets: DashboardWidgets;
}

function buildDraft(s: {
  dailyGoal: number; maintenanceIntervalKm: number; lastMaintenanceKm: number; dashboardWidgets: DashboardWidgets;
}): DraftSettings {
  return {
    dailyGoal: s.dailyGoal,
    maintenanceIntervalKm: s.maintenanceIntervalKm,
    lastMaintenanceKm: s.lastMaintenanceKm,
    dashboardWidgets: { ...s.dashboardWidgets },
  };
}

function isEqualDraft(a: DraftSettings, b: DraftSettings) {
  return (
    a.dailyGoal === b.dailyGoal &&
    a.maintenanceIntervalKm === b.maintenanceIntervalKm &&
    a.lastMaintenanceKm === b.lastMaintenanceKm &&
    (Object.keys(a.dashboardWidgets) as (keyof DashboardWidgets)[]).every(
      (k) => a.dashboardWidgets[k] === b.dashboardWidgets[k],
    )
  );
}

/** Section group header used to visually group multiple accordion cards. */
function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

/** Polished accordion card matching the app's premium identity. */
function SettingsCard({
  value, icon, title, badge, children,
}: {
  value: string; icon: React.ReactNode; title: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-2xl border border-border bg-card px-4 shadow-[0_1px_0_0_hsl(var(--border)),0_8px_24px_-18px_rgba(0,0,0,0.45)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:shadow-[0_1px_0_0_hsl(var(--border)),0_14px_36px_-20px_rgba(0,0,0,0.55)] data-[state=open]:bg-card/95"
    >
      <AccordionTrigger className="py-3.5 hover:no-underline">
        <div className="flex flex-1 items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
          <span className="text-[15px] font-semibold">{title}</span>
          {badge}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="animate-fade-in space-y-3">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** Disabled "coming soon" row used to hint at upcoming options without faking them. */
function SoonRow({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3 opacity-70">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Em breve
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const {
    settings, updateSettings, entries, cars, activeCar, carInitialKm,
    setActiveCar, refreshCars, expenseCategories, earningPlatforms, deleteCategory,
  } = useData();
  const { user, signOut } = useAuth();
  const totalKmDriven = totalKmAllTime(entries);
  const realCurrentKm = carInitialKm + totalKmDriven;

  // ---- Profile (kept with its own save action)
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileBaseline, setProfileBaseline] = useState({ name: "", avatar: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [fontScale] = useFontScale();
  const fontScaleLabel = FONT_SCALE_OPTIONS.find((o) => o.value === fontScale)?.label ?? "Padrão";

  const provider = (user?.app_metadata as { provider?: string } | undefined)?.provider ?? "email";
  const isOAuthGoogle = provider === "google";

  // ---- Dialogs
  const [carDialog, setCarDialog] = useState<{ open: boolean; car: CarType | null }>({ open: false, car: null });
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });
  const [platDialog, setPlatDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });

  // ---- Draft for batched-save settings
  const baseline = useMemo<DraftSettings>(() => buildDraft(settings), [settings]);
  const [draft, setDraft] = useState<DraftSettings>(baseline);
  const [saving, setSaving] = useState(false);

  // Sync draft when remote settings change (e.g. after save).
  useEffect(() => {
    setDraft(buildDraft(settings));
  }, [settings]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || "");
          setAvatarUrl(data.avatar_url || "");
          setProfileBaseline({ name: data.display_name || "", avatar: data.avatar_url || "" });
        }
      });
  }, [user]);

  const dirty = !isEqualDraft(draft, baseline);
  const profileDirty = displayName !== profileBaseline.name;

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, display_name: displayName || null, avatar_url: avatarUrl || null,
    });
    setSavingProfile(false);
    if (error) return toast.error(friendlyDbError(error, "Não foi possível salvar o perfil."));
    setProfileBaseline({ name: displayName, avatar: avatarUrl });
    toast.success("Perfil atualizado");
  };

  const saveDraft = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await updateSettings({
        dailyGoal: draft.dailyGoal,
        maintenanceIntervalKm: draft.maintenanceIntervalKm,
        lastMaintenanceKm: draft.lastMaintenanceKm,
        dashboardWidgets: draft.dashboardWidgets,
      });
      toast.success("Ajustes salvos");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const cancelDraft = () => setDraft(buildDraft(settings));

  const setWidget = (k: keyof DashboardWidgets, v: boolean) =>
    setDraft((d) => ({ ...d, dashboardWidgets: { ...d.dashboardWidgets, [k]: v } }));

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

  const widgets = draft.dashboardWidgets;

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className={cn("px-4 pt-5 pb-6 space-y-6", dirty && "pb-32")}>

        {/* ============== CONTA ============== */}
        <SectionGroup title="Conta">
          <Accordion type="multiple" className="space-y-2.5">
            <SettingsCard value="profile" icon={<UserIcon className="h-4 w-4" />} title="Perfil">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 ring-2 ring-border">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary/15 text-primary"><UserIcon className="h-6 w-6" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{displayName || "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="transition-shadow duration-200 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                />
              </div>

              <Button onClick={saveProfile} disabled={savingProfile || !profileDirty} className="w-full">
                {savingProfile ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar perfil"}
              </Button>

              {/* Authentication / password */}
              <div className="pt-1">
                {isOAuthGoogle ? (
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.32z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                    </svg>
                    <span className="text-xs text-muted-foreground">Conta conectada via Google</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setPwdOpen(true)}
                  >
                    <KeyRound className="mr-2 h-4 w-4" /> Alterar senha
                  </Button>
                )}
              </div>
            </SettingsCard>

            <SettingsCard value="appearance" icon={<Palette className="h-4 w-4" />} title="Aparência">
              {/* Theme */}
              <div className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground/80">
                    {settings.theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Modo escuro</div>
                    <div className="text-[11px] text-muted-foreground">
                      {settings.theme === "dark" ? "Ativado" : "Desativado"}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={settings.theme === "dark"}
                  onCheckedChange={(v) => updateSettings({ theme: v ? "dark" : "light" })}
                />
              </div>

              {/* Font size */}
              <button
                type="button"
                onClick={() => setFontOpen(true)}
                className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground/80">
                    <Type className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Tamanho dos textos</div>
                    <div className="text-[11px] text-muted-foreground">{fontScaleLabel}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Tela inicial */}
              <div className="pt-2">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Tela inicial
                </div>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Escolha quais blocos deseja visualizar na tela inicial.
                </p>
                <div className="space-y-2">
                  {[
                    { k: "goal" as const, label: "Meta diária" },
                    { k: "stats" as const, label: "Performance" },
                    { k: "byApp" as const, label: "Ganhos por aplicativo" },
                    { k: "byExpense" as const, label: "Gastos" },
                  ].map((w) => (
                    <div key={w.k} className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/30">
                      <span className="text-sm">{w.label}</span>
                      <Switch checked={widgets[w.k]} onCheckedChange={(v) => setWidget(w.k, v)} />
                    </div>
                  ))}
                </div>
              </div>
            </SettingsCard>

            <SettingsCard value="account" icon={<Database className="h-4 w-4" />} title="Conta e dados">
              <Button variant="outline" className="w-full" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sair da conta
              </Button>

              <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" /> Zona de perigo
                </div>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  Esta ação remove todos os ganhos e gastos da sua conta e não pode ser desfeita.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={clearAll}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Apagar todos os meus dados
                </Button>
              </div>
            </SettingsCard>
          </Accordion>
        </SectionGroup>

        {/* ============== VEÍCULO ============== */}
        <SectionGroup title="Veículo">
          <Accordion type="multiple" className="space-y-2.5">
            <SettingsCard
              value="cars"
              icon={<Car className="h-4 w-4" />}
              title="Meus carros"
              badge={cars.length > 0 ? (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums">{cars.length}</span>
              ) : undefined}
            >
              <Button size="sm" variant="outline" className="w-full" onClick={() => setCarDialog({ open: true, car: null })}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar carro
              </Button>
              {cars.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Nenhum carro cadastrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {cars.map((c) => (
                    <div key={c.id} className={cn(
                      "rounded-xl border p-3 transition-all duration-200",
                      c.is_active ? "border-primary/60 bg-primary/[0.06]" : "border-border hover:bg-muted/30",
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
            </SettingsCard>

            <SettingsCard value="maint" icon={<Wrench className="h-4 w-4" />} title="Manutenção preventiva">
              {activeCar && (
                <div className="text-xs text-muted-foreground">
                  Carro ativo: <span className="font-semibold text-foreground">{carLabel(activeCar)}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Intervalo (km)</Label>
                <NumberField
                  value={draft.maintenanceIntervalKm || null}
                  onChange={(v) => setDraft((d) => ({ ...d, maintenanceIntervalKm: v ?? 0 }))}
                  decimal={false}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Última manutenção feita em (km)</Label>
                <NumberField
                  value={draft.lastMaintenanceKm || null}
                  onChange={(v) => setDraft((d) => ({ ...d, lastMaintenanceKm: v ?? 0 }))}
                  decimal={false}
                />
              </div>
              <div className="rounded-xl bg-muted/60 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Km atual do carro</span>
                  <span className="font-semibold tabular-nums">{num(realCurrentKm, 1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Km rodados no app</span>
                  <span className="font-semibold tabular-nums">{num(totalKmDriven, 1)} km</span>
                </div>
              </div>
            </SettingsCard>
          </Accordion>
        </SectionGroup>

        {/* ============== FINANCEIRO ============== */}
        <SectionGroup title="Financeiro">
          <Accordion type="multiple" className="space-y-2.5">
            <SettingsCard value="plats" icon={<Tags className="h-4 w-4" />} title="Plataformas de ganho">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setPlatDialog({ open: true, editing: null })}>
                <Plus className="mr-1 h-4 w-4" /> Nova plataforma
              </Button>
              <div className="space-y-2">
                {earningPlatforms.map((p) => (
                  <div key={p.key} className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted/30">
                    <PlatformLogo platformKey={p.key} label={p.label} hex={p.hex} size="sm" imageUrl={p.imageUrl} />
                    <div className="min-w-0 flex-1 truncate text-sm font-medium">{p.label}</div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => setPlatDialog({ open: true, editing: { id: p.id, key: p.key, label: p.label, emoji: p.emoji, color: p.hex, platformType: p.type, imageUrl: p.imageUrl } })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {p.isCustom && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                          onClick={() => tryDeletePlatform(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard value="cats" icon={<Tags className="h-4 w-4" />} title="Categorias de gasto">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setCatDialog({ open: true, editing: null })}>
                <Plus className="mr-1 h-4 w-4" /> Nova categoria
              </Button>
              <div className="space-y-2">
                {expenseCategories.map((c) => (
                  <div key={c.key} className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted/30">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                      style={{ backgroundColor: c.hex + "33" }}>{c.emoji}</span>
                    <div className="min-w-0 flex-1 truncate text-sm font-medium">{c.label}</div>
                    <div className="flex shrink-0 items-center gap-0.5">
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
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard value="goals" icon={<Target className="h-4 w-4" />} title="Metas e objetivos">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Meta diária</Label>
                <NumberField
                  currency
                  value={draft.dailyGoal || null}
                  onChange={(v) => setDraft((d) => ({ ...d, dailyGoal: v ?? 0 }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Define o objetivo de ganho líquido para cada dia trabalhado.
                </p>
              </div>

              <div className="pt-1">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Metas avançadas
                </div>
                <div className="space-y-2">
                  <SoonRow label="Meta semanal" hint="Influencia sugestões diárias automaticamente" />
                  <SoonRow label="Meta mensal" hint="Define o objetivo principal do mês" />
                  <SoonRow label="Bruto ou líquido" hint="Escolha como suas metas serão calculadas" />
                  <SoonRow label="Sugestões inteligentes" hint="Volant calcula a meta diária a partir da mensal" />
                </div>
              </div>
            </SettingsCard>
          </Accordion>
        </SectionGroup>

        {/* ============== FEEDBACK ============== */}
        <SectionGroup title="Feedback">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_0_0_hsl(var(--border)),0_8px_24px_-18px_rgba(0,0,0,0.45)]">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[15px] font-semibold">Feedback</div>
                <p className="text-[11px] text-muted-foreground">
                  Encontrou um problema ou tem uma ideia para melhorar o Volant?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-10 justify-start gap-2"
                onClick={() => setFeedback({ open: true, type: "bug" })}
              >
                <Bug className="h-4 w-4" /> Reportar bug
              </Button>
              <Button
                variant="outline"
                className="h-10 justify-start gap-2"
                onClick={() => setFeedback({ open: true, type: "suggestion" })}
              >
                <Lightbulb className="h-4 w-4" /> Sugerir melhoria
              </Button>
            </div>
          </div>
        </SectionGroup>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Volant · Dados sincronizados na nuvem
        </p>
      </div>

      {/* Floating save bar — refined, contextual, low-key */}
      <div
        className={cn(
          "fixed left-0 right-0 z-40 px-3 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
      >
        <div className="mx-auto flex max-w-md items-center gap-1.5 rounded-full border border-border/70 bg-background/80 py-1.5 pl-4 pr-1.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.5)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <span className="flex-1 truncate text-[12px] text-muted-foreground">
            Alterações não salvas
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
            onClick={cancelDraft}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            onClick={saveDraft}
            disabled={saving}
          >
            {saving ? (<><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando</>) : "Salvar"}
          </Button>
        </div>
      </div>

      <PasswordChangeDialog
        open={pwdOpen}
        onOpenChange={setPwdOpen}
        email={user?.email ?? ""}
      />
      <FontSizeSheet open={fontOpen} onOpenChange={setFontOpen} />

      <FeedbackDialog
        open={feedback.open}
        onOpenChange={(o) => setFeedback((s) => ({ ...s, open: o }))}
        initialType={feedback.type}
      />

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
