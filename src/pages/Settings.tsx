import { useEffect, useMemo, useRef, useState } from "react";
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
  CheckCircle2, Wrench, Target, Palette, Database, Tags, Loader2,
  KeyRound, Type, ChevronRight, MessageSquare, Bug, Lightbulb,
  Home as HomeIcon, BarChart3, Receipt, Gauge, Wallet, CalendarDays,
  Route, Clock, Flag, LineChart, ArrowUp, ArrowDown, Timer as TimerIcon, GripVertical,
  Sparkles, Bold, Italic, Type as TypeIcon,
} from "lucide-react";
import { VolantLogo } from "@/components/VolantLogo";
import { useGreetingStyle, greetingStyleClass, type GreetingStyle } from "@/lib/greetingStyle";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableHomeRow } from "@/components/account/SortableHomeRow";
import { useReportWidgets, type ReportWidgets } from "@/lib/reportWidgets";
import { useHomeOrder, type HomeCardKey } from "@/lib/homeOrder";
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
}

function buildDraft(s: { dailyGoal: number; maintenanceIntervalKm: number; lastMaintenanceKm: number }): DraftSettings {
  return {
    dailyGoal: s.dailyGoal,
    maintenanceIntervalKm: s.maintenanceIntervalKm,
    lastMaintenanceKm: s.lastMaintenanceKm,
  };
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

/** Compact, premium mini card toggle. Subtle dark-green tint when active. */
function MiniCardToggle({
  active, icon, label, onClick,
}: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2.5 text-center min-h-[64px]",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]",
        active
          ? "border-primary/45 bg-primary/[0.08] text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_4px_14px_-10px_hsl(var(--primary)/0.5)]"
          : "border-border/60 bg-muted/25 text-muted-foreground hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-300",
          active ? "text-primary" : "text-muted-foreground/70",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-[10.5px] font-semibold leading-tight transition-colors duration-300 line-clamp-2",
          active ? "text-foreground" : "text-muted-foreground/80",
        )}
      >
        {label}
      </span>
    </button>
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

  // ---- Profile state
  const accountName = useMemo(() => {
    const md = (user?.user_metadata ?? {}) as Record<string, unknown>;
    return (
      (md.full_name as string) ||
      (md.name as string) ||
      (md.display_name as string) ||
      user?.email?.split("@")[0] ||
      "Motorista"
    );
  }, [user]);
  const accountAvatar = useMemo(() => {
    const md = (user?.user_metadata ?? {}) as Record<string, unknown>;
    return (md.avatar_url as string) || (md.picture as string) || "";
  }, [user]);

  const [nickname, setNickname] = useState("");
  const [nicknameBaseline, setNicknameBaseline] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [fontScale] = useFontScale();
  const fontScaleLabel = FONT_SCALE_OPTIONS.find((o) => o.value === fontScale)?.label ?? "Padrão";
  const [reportWidgets, toggleReportWidget] = useReportWidgets();
  const [homeOrder, moveHome, reorderHome] = useHomeOrder();
  const [customizeOpen, setCustomizeOpen] = useState<string>("");
  const [greetingStyle, setGreetingStyle] = useGreetingStyle();

  // DnD sensors — TouchSensor with small delay prevents scroll conflicts on mobile.
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  // Subtle, premium autosave confirmation. Reuses a single toast id to avoid stacking.
  const notifySaved = () =>
    toast.success("Alterações salvas", { id: "autosave", duration: 1600 });
  const notifySaveError = () =>
    toast.error("Não foi possível salvar agora. Tente novamente.", { id: "autosave" });

  // Wrap updateSettings so any auto-saved change shows the discreet feedback.
  const autoSave = async (patch: Parameters<typeof updateSettings>[0]) => {
    try {
      await updateSettings(patch);
      notifySaved();
    } catch {
      notifySaveError();
    }
  };

  const provider = (user?.app_metadata as { provider?: string } | undefined)?.provider ?? "email";
  const isOAuthGoogle = provider === "google";

  // Load profile (nickname + saved avatar) from Supabase
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await (supabase
        .from("profiles") as any)
        .select("nickname, avatar_url, greeting_message")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      const row = (data ?? {}) as { nickname?: string | null; avatar_url?: string | null; greeting_message?: string | null };
      const n = row.nickname ?? "";
      setNickname(n);
      setNicknameBaseline(n);
      setProfileAvatar(row.avatar_url ?? "");
      setGreetingMessage(row.greeting_message ?? "");
    })();
    return () => { active = false; };
  }, [user]);

  const displayedAvatar = profileAvatar || accountAvatar;

  // ---- Dialogs
  const [carDialog, setCarDialog] = useState<{ open: boolean; car: CarType | null }>({ open: false, car: null });
  const [catDialog, setCatDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });
  const [platDialog, setPlatDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });

  // ---- Draft for explicit-save settings (goals + maintenance)
  const [draft, setDraft] = useState<DraftSettings>(() => buildDraft(settings));

  // Sync draft when remote settings change.
  useEffect(() => {
    setDraft(buildDraft(settings));
  }, [settings]);

  const goalsDirty = draft.dailyGoal !== settings.dailyGoal;
  const maintDirty =
    draft.maintenanceIntervalKm !== settings.maintenanceIntervalKm ||
    draft.lastMaintenanceKm !== settings.lastMaintenanceKm;

  const [savingGoals, setSavingGoals] = useState(false);
  const [savingMaint, setSavingMaint] = useState(false);

  const saveGoals = async () => {
    setSavingGoals(true);
    try {
      await updateSettings({ dailyGoal: draft.dailyGoal });
      toast.success("Meta atualizada");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSavingGoals(false);
    }
  };

  const saveMaint = async () => {
    setSavingMaint(true);
    try {
      await updateSettings({
        maintenanceIntervalKm: draft.maintenanceIntervalKm,
        lastMaintenanceKm: draft.lastMaintenanceKm,
      });
      toast.success("Manutenção atualizada");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSavingMaint(false);
    }
  };

  const nicknameDirty = nickname.trim() !== nicknameBaseline.trim();

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const trimmed = nickname.trim();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, nickname: trimmed || null } as any);
    setSavingProfile(false);
    if (error) return toast.error(friendlyDbError(error, "Não foi possível salvar o perfil."));
    setNicknameBaseline(trimmed);
    toast.success("Perfil atualizado");
  };

  // Greeting message — autosaved with debounce. Persists to profiles.greeting_message.
  const greetingMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistGreetingMessage = async (value: string) => {
    if (!user) return;
    const trimmed = value.trim().slice(0, 60);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, greeting_message: trimmed || null } as any);
    if (error) {
      notifySaveError();
      return;
    }
    notifySaved();
  };
  const updateGreetingMessage = (value: string, immediate = false) => {
    const v = value.slice(0, 60);
    setGreetingMessage(v);
    if (greetingMsgTimer.current) clearTimeout(greetingMsgTimer.current);
    if (immediate) {
      void persistGreetingMessage(v);
    } else {
      greetingMsgTimer.current = setTimeout(() => void persistGreetingMessage(v), 600);
    }
  };
  const setWidget = (k: keyof DashboardWidgets, v: boolean) => {
    void autoSave({
      dashboardWidgets: { ...settings.dashboardWidgets, [k]: v },
    });
  };

  // Toggle for report widgets — uses local storage but still confirms via subtle toast.
  const toggleReport = (k: keyof ReportWidgets) => {
    toggleReportWidget(k);
    notifySaved();
  };

  // Reorder a Home card and confirm.
  const moveHomeCard = (k: HomeCardKey, dir: -1 | 1) => {
    moveHome(k, dir);
    notifySaved();
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

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Gerencie suas preferências" />
      <div className={"px-4 pt-5 pb-6 space-y-6"}>

        {/* ============== CONTA ============== */}
        <SectionGroup title="Conta">
          <Accordion type="multiple" className="space-y-2.5">
            <SettingsCard value="profile" icon={<UserIcon className="h-4 w-4" />} title="Perfil">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 ring-2 ring-border">
                  <AvatarImage src={displayedAvatar} alt={accountName} referrerPolicy="no-referrer" />
                  <AvatarFallback className="bg-primary/15 text-primary"><UserIcon className="h-6 w-6" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{accountName}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  {isOAuthGoogle && (
                    <div className="mt-1 inline-flex items-center gap-1.5 text-[10.5px] font-medium text-muted-foreground/80">
                      <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.32z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
                      </svg>
                      Conectado com Google
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Como deseja ser chamado?</Label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={accountName}
                  maxLength={40}
                  className="transition-shadow duration-200 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Apelido usado nas saudações do app.
                </p>
              </div>

              <Button onClick={saveProfile} disabled={savingProfile || !nicknameDirty} className="w-full">
                {savingProfile ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar"}
              </Button>

              {/* Password (for non-Google accounts) */}
              {!isOAuthGoogle && (
                <div className="pt-1">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setPwdOpen(true)}
                  >
                    <KeyRound className="mr-2 h-4 w-4" /> Alterar senha
                  </Button>
                </div>
              )}
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

        {/* ============== PERSONALIZAÇÃO ============== */}
        <SectionGroup title="Personalização">
          <Accordion
            type="single"
            collapsible
            value={customizeOpen}
            onValueChange={setCustomizeOpen}
            className="space-y-2.5"
          >
            <SettingsCard value="appearance" icon={<Palette className="h-4 w-4" />} title="Aparência">
              {/* Theme */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/70 text-foreground/80">
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
                  onCheckedChange={(v) => autoSave({ theme: v ? "dark" : "light" })}
                />
              </div>

              {/* Font size */}
              <button
                type="button"
                onClick={() => setFontOpen(true)}
                className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3 text-left transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/70 text-foreground/80">
                    <Type className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Tamanho dos textos</div>
                    <div className="text-[11px] text-muted-foreground">{fontScaleLabel}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </SettingsCard>

            <SettingsCard value="home" icon={<HomeIcon className="h-4 w-4" />} title="Tela inicial">
              <p className="text-[11px] text-muted-foreground">
                Toque no card para ativar/desativar. Arraste pela alça <GripVertical className="inline h-3 w-3 align-text-bottom" /> ou use as setas para reordenar.
              </p>
              {(() => {
                const labels: Partial<Record<HomeCardKey, { label: string; icon: React.ReactNode }>> = {
                  goal:      { label: "Meta",        icon: <Target className="h-4 w-4" /> },
                  stats:     { label: "Performance", icon: <Gauge className="h-4 w-4" /> },
                  byApp:     { label: "Por app",     icon: <BarChart3 className="h-4 w-4" /> },
                  byExpense: { label: "Gastos",      icon: <Receipt className="h-4 w-4" /> },
                  journey:   { label: "Jornada",     icon: <TimerIcon className="h-4 w-4" /> },
                };
                // Greeting is managed in the dedicated "Saudação" section above.
                const draggable = homeOrder.filter((k) => k !== "greeting");

                const onDragEnd = (e: DragEndEvent) => {
                  const { active, over } = e;
                  if (!over || active.id === over.id) return;
                  reorderHome(active.id as HomeCardKey, over.id as HomeCardKey);
                  notifySaved();
                };

                const renderRowInner = (k: HomeCardKey, i: number, isLast: boolean) => {
                  const meta = labels[k]!;
                  const active = (widgets as any)[k] as boolean;
                  return (
                    <>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        aria-label={meta.label}
                        onClick={() => setWidget(k as keyof DashboardWidgets, !active)}
                        className="flex flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-transform active:scale-[0.98]"
                      >
                        <span className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                          active ? "bg-primary/15 text-primary" : "bg-background/60 text-muted-foreground/70",
                        )}>{meta.icon}</span>
                        <span className={cn(
                          "text-[13px] font-semibold",
                          active ? "text-foreground" : "text-muted-foreground/80",
                        )}>{meta.label}</span>
                        <span className={cn(
                          "ml-auto text-[10px] font-bold uppercase tracking-wider",
                          active ? "text-primary/80" : "text-muted-foreground/60",
                        )}>{active ? "Ativo" : "Oculto"}</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 pl-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                          disabled={i === 0}
                          onClick={() => moveHomeCard(k, -1)}
                          aria-label={`Mover ${meta.label} para cima`}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                          disabled={isLast}
                          onClick={() => moveHomeCard(k, 1)}
                          aria-label={`Mover ${meta.label} para baixo`}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  );
                };

                return (
                  <div className="space-y-2">
                    <DndContext
                      sensors={dndSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={onDragEnd}
                    >
                      <SortableContext items={draggable} strategy={verticalListSortingStrategy}>
                        {draggable.map((k, i) => {
                          const isLast = i === draggable.length - 1;
                          return (
                            <SortableHomeRow
                              key={k}
                              id={k}
                              active={(widgets as any)[k] as boolean}
                            >
                              <div className="flex items-center gap-1">
                                {renderRowInner(k, i, isLast)}
                              </div>
                            </SortableHomeRow>
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  </div>
                );
              })()}
            </SettingsCard>

            <SettingsCard value="reports" icon={<BarChart3 className="h-4 w-4" />} title="Relatórios">
              <p className="text-[11px] text-muted-foreground">
                Toque para ativar ou desativar os blocos da tela de relatórios.
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { k: "net",        label: "Líquido",      icon: <Wallet className="h-4 w-4" /> },
                  { k: "perHour",    label: "R$ / hora",    icon: <Gauge className="h-4 w-4" /> },
                  { k: "gross",      label: "Bruto",        icon: <Wallet className="h-4 w-4" /> },
                  { k: "expenses",   label: "Gastos",       icon: <Receipt className="h-4 w-4" /> },
                  { k: "activeDays", label: "Dias ativos",  icon: <CalendarDays className="h-4 w-4" /> },
                  { k: "perDay",     label: "Média / dia",  icon: <Clock className="h-4 w-4" /> },
                  { k: "totalKm",    label: "KM total",     icon: <Route className="h-4 w-4" /> },
                  { k: "perKm",      label: "R$ / km",      icon: <Route className="h-4 w-4" /> },
                  { k: "trips",      label: "Corridas",     icon: <Flag className="h-4 w-4" /> },
                  { k: "perTrip",    label: "R$ / corrida", icon: <Flag className="h-4 w-4" /> },
                  { k: "chart",      label: "Gráfico",      icon: <LineChart className="h-4 w-4" /> },
                ] as { k: keyof ReportWidgets; label: string; icon: React.ReactNode }[]).map((w) => (
                  <MiniCardToggle
                    key={w.k}
                    active={reportWidgets[w.k]}
                    icon={w.icon}
                    label={w.label}
                    onClick={() => toggleReport(w.k)}
                  />
                ))}
              </div>
            </SettingsCard>
          </Accordion>
        </SectionGroup>

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
              <Button onClick={saveMaint} disabled={savingMaint || !maintDirty} className="w-full">
                {savingMaint ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar"}
              </Button>
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

              <Button onClick={saveGoals} disabled={savingGoals || !goalsDirty} className="w-full">
                {savingGoals ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar"}
              </Button>

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
                onClick={() => setBugOpen(true)}
              >
                <Bug className="h-4 w-4" /> Reportar bug
              </Button>
              <Button
                variant="outline"
                className="h-10 justify-start gap-2"
                onClick={() => setSuggestionOpen(true)}
              >
                <Lightbulb className="h-4 w-4" /> Sugerir melhoria
              </Button>
            </div>
          </div>
        </SectionGroup>

        {/* App footer */}
        <footer className="pt-4 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          <div className="font-semibold text-muted-foreground">{APP_NAME}</div>
          <div>Versão {APP_VERSION_LABEL}</div>
          <div>Dados sincronizados na nuvem</div>
        </footer>
      </div>

      <PasswordChangeDialog
        open={pwdOpen}
        onOpenChange={setPwdOpen}
        email={user?.email ?? ""}
      />
      <FontSizeSheet open={fontOpen} onOpenChange={setFontOpen} />

      <BugReportDialog open={bugOpen} onOpenChange={setBugOpen} />
      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />

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
