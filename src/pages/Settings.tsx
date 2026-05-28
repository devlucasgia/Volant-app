import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

import { VehicleCostsCard } from "@/components/vehicle/VehicleCostsCard";
import { CategoryDialog } from "@/components/CategoryDialog";
import { PlatformLogo } from "@/components/PlatformLogo";
import { totalKmAllTime, deriveGoals } from "@/lib/stats";
import { num } from "@/lib/format";
import {
  Moon, Sun, AlertTriangle, LogOut, User as UserIcon, Car, Plus, Pencil, Trash2,
  CheckCircle2, Wrench, Target, Palette, Database, Tags, Loader2,
  KeyRound, Type, ChevronRight, MessageSquare, Bug, Lightbulb,
  Home as HomeIcon, BarChart3, Receipt, Gauge, Wallet, CalendarDays,
  Route, Clock, Flag, LineChart, ArrowUp, ArrowDown, Timer as TimerIcon, GripVertical,
  Sparkles, Bold, Italic, Type as TypeIcon, Info, Bell, Camera, Crown, Check, ArrowLeftRight,
  Brain, Warehouse, Paintbrush,
} from "lucide-react";
import { SmartKmSection } from "@/components/account/SmartKmSection";
import { SubscriptionSheet } from "@/components/account/SubscriptionSheet";
import { UpgradeToYearlyDialog } from "@/components/account/UpgradeToYearlyDialog";
import { useSubscription } from "@/hooks/useSubscription";
import volantSymbol from "@/assets/volant-symbol-header.png";
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
import { friendlyDbError, verifyImageSignature } from "@/lib/friendlyErrors";

interface DraftSettings {
  monthlyGoal: number;
  maintenanceIntervalKm: number;
  lastMaintenanceKm: number;
  goalType: "liquido" | "bruto";
  workingDaysPerMonth: number | null;
}

function buildDraft(s: {
  monthlyGoal: number; maintenanceIntervalKm: number; lastMaintenanceKm: number;
  goalType: "liquido" | "bruto"; workingDaysPerMonth: number | null;
}): DraftSettings {
  return {
    monthlyGoal: s.monthlyGoal,
    maintenanceIntervalKm: s.maintenanceIntervalKm,
    lastMaintenanceKm: s.lastMaintenanceKm,
    goalType: s.goalType,
    workingDaysPerMonth: s.workingDaysPerMonth,
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
  value, icon, title, badge, children, iconTone, accent,
}: {
  value: string; icon: React.ReactNode; title: string; badge?: React.ReactNode;
  children: React.ReactNode; iconTone?: string;
  /** Optional subtle border accent that matches the section family. */
  accent?: "amber";
}) {
  const accentClass =
    accent === "amber"
      ? "border-amber-400/25 shadow-[0_1px_0_0_hsl(var(--border)),0_9px_25px_-18px_rgba(245,158,11,0.31)] data-[state=open]:shadow-[0_1px_0_0_hsl(var(--border)),0_14px_35px_-20px_rgba(245,158,11,0.40)]"
      : "border-border shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)] data-[state=open]:shadow-[0_1px_0_0_hsl(var(--border)),0_12px_32px_-20px_rgba(0,0,0,0.48)]";
  return (
    <AccordionItem
      value={value}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card px-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:bg-card/95",
        accentClass,
      )}
    >
      <AccordionTrigger className="py-3.5 hover:no-underline">
        <div className="flex flex-1 items-center gap-2.5">
          <span className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]",
            iconTone || "bg-primary/10 text-primary",
          )}>
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

function SubscriptionCard({
  onOpenAcquisition,
  onOpenUpgrade,
  onManage,
  managing,
}: {
  onOpenAcquisition: () => void;
  onOpenUpgrade: () => void;
  onManage: () => void;
  managing: boolean;
}) {
  const { user } = useAuth();
  const {
    isPaidPremium,
    isGrandfathered,
    subscription,
    internalTrialActive,
    internalTrialExpired,
    internalTrialEndsAt,
  } = useSubscription(user?.id);

  const isYearly = subscription?.price_id === "volant_premium_yearly";
  const isMonthly = subscription?.price_id === "volant_premium_monthly";

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    } catch { return null; }
  };
  const nextBilling = subscription ? formatDate(subscription.current_period_end) : null;
  const trialEndLabel = formatDate(internalTrialEndsAt);

  const goldBadge = "rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 shadow-[0_0_10px_-4px_rgba(245,158,11,0.55)]";
  const grayBadge = "rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground";
  const expiredBadge = "rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive";
  const badge = isGrandfathered ? (
    <span className={goldBadge}>Premium Vitalício</span>
  ) : isPaidPremium ? (
    <span className={goldBadge}>Premium</span>
  ) : internalTrialActive ? (
    <span className={grayBadge}>Teste ativo</span>
  ) : internalTrialExpired ? (
    <span className={expiredBadge}>Expirado</span>
  ) : null;

  // Premium dark-green upgrade button (no neon).
  const upgradeBtnClass = cn(
    "group relative w-full overflow-hidden h-11",
    "border border-primary/40 text-foreground",
    "bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(142_60%_14%)_55%,hsl(142_65%_20%)_100%)]",
    "shadow-[inset_0_1px_0_hsl(var(--primary)/0.18),0_8px_24px_-14px_hsl(var(--primary)/0.55)]",
    "hover:brightness-110 transition-all",
  );

  return (
    <SettingsCard value="subscription" icon={<Crown className="h-4 w-4" />} title="Assinatura" badge={badge} iconTone="bg-amber-400/12 text-amber-300 shadow-[0_0_16px_-4px_rgba(245,158,11,0.48)]" accent="amber">

      {isGrandfathered ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Premium Vitalício</p>
          <p className="text-sm text-muted-foreground">
            Acesso completo ao Volant, permanente e sem cobranças.
          </p>
        </div>
      ) : isPaidPremium ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <div className="font-medium">
              {isYearly ? "Plano Anual" : "Plano Mensal"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {subscription?.status === "past_due" ? "Pagamento pendente" : "Assinatura ativa"}
              {subscription?.cancel_at_period_end ? " · cancelamento agendado" : ""}
            </div>
            {nextBilling && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {isYearly ? "Próxima renovação" : "Próxima cobrança"}: {nextBilling}
              </div>
            )}
            {isYearly && (
              <div className="mt-1 text-xs text-primary">Você está no melhor plano do Volant.</div>
            )}
          </div>

          {isMonthly && !subscription?.cancel_at_period_end && (
            <Button onClick={onOpenUpgrade} className={upgradeBtnClass}>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,hsl(var(--primary)/0.22)_50%,transparent_70%)] group-hover:translate-x-full transition-transform duration-700"
              />
              <Crown className="h-4 w-4 text-primary" />
              <span className="font-semibold">Upgrade de plano</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onManage}
            disabled={managing}
            className="w-full"
          >
            {managing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerenciar assinatura"}
          </Button>
        </div>
      ) : internalTrialActive ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Acesso Premium por 7 dias
          </p>
          {trialEndLabel && (
            <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Termina em <span className="font-semibold text-foreground">{trialEndLabel}</span>
            </div>
          )}
          <Button onClick={onOpenAcquisition} className="w-full gradient-success text-primary-foreground">
            Assinar agora
          </Button>
        </div>
      ) : internalTrialExpired ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Seu acesso Premium terminou</p>
          <p className="text-sm text-muted-foreground">
            Seus dados continuam salvos. Assine para voltar a usar os recursos Premium do Volant.
          </p>
          <Button onClick={onOpenAcquisition} className="w-full gradient-success text-primary-foreground">
            Ver planos
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Assine e tenha acesso completo aos recursos Premium do Volant.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-[11px] text-muted-foreground">Mensal</div>
              <div className="mt-0.5 text-sm font-semibold text-foreground">R$ 19,90<span className="text-[11px] font-normal text-muted-foreground">/mês</span></div>
            </div>
            <div className="relative rounded-xl border border-primary/50 bg-primary/5 p-3">
              <span className="absolute -top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                −62%
              </span>
              <div className="text-[11px] text-muted-foreground">Anual</div>
              <div className="mt-0.5 text-sm font-semibold text-foreground">R$ 89,90<span className="text-[11px] font-normal text-muted-foreground">/ano</span></div>
            </div>
          </div>
          <Button onClick={onOpenAcquisition} className="w-full gradient-success text-primary-foreground">
            Ver planos
          </Button>
        </div>
      )}
    </SettingsCard>
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionInitialView, setSubscriptionInitialView] = useState<"auto" | "plans">("auto");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { getStripeEnvironment } = await import("@/lib/stripe");
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/ajustes`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPortalLoading(false);
    }
  };
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
      setGreetingMessage(row.greeting_message ?? "");

      // Resolve avatar:
      // - http(s) URLs (legacy public, or Google) → use as-is
      // - storage paths like "<uid>/file.jpg" → fetch signed URL
      const stored = row.avatar_url ?? "";
      if (!stored) {
        setProfileAvatar("");
      } else if (/^https?:\/\//i.test(stored)) {
        // Legacy public URL from old bucket → extract path and sign
        const m = stored.match(/\/storage\/v1\/object\/(?:public|sign)\/avatars\/([^?]+)/i);
        if (m && m[1]) {
          const { data: signed } = await supabase.storage
            .from("avatars")
            .createSignedUrl(decodeURIComponent(m[1]), 60 * 60 * 24 * 365);
          if (active) setProfileAvatar(signed?.signedUrl ?? "");
        } else {
          setProfileAvatar(stored);
        }
      } else {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(stored, 60 * 60 * 24 * 365);
        if (active) setProfileAvatar(signed?.signedUrl ?? "");
      }
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

  const availableDaysThisMonth = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return end - now.getDate() + 1;
  }, []);
  const workingDaysInvalid =
    draft.workingDaysPerMonth != null &&
    (draft.workingDaysPerMonth < 1 || draft.workingDaysPerMonth > availableDaysThisMonth);

  const goalsDirty =
    draft.monthlyGoal !== settings.monthlyGoal ||
    draft.goalType !== settings.goalType ||
    draft.workingDaysPerMonth !== settings.workingDaysPerMonth;
  const maintDirty =
    draft.maintenanceIntervalKm !== settings.maintenanceIntervalKm ||
    draft.lastMaintenanceKm !== settings.lastMaintenanceKm;

  const [savingGoals, setSavingGoals] = useState(false);
  const [savingMaint, setSavingMaint] = useState(false);

  const saveGoals = async () => {
    if (workingDaysInvalid) return;
    setSavingGoals(true);
    try {
      await updateSettings({
        monthlyGoal: draft.monthlyGoal,
        goalType: draft.goalType,
        workingDaysPerMonth: draft.workingDaysPerMonth,
      });
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

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    const check = await verifyImageSignature(file, 5 * 1024 * 1024);
    if (!check.ok) {
      // Map size error vs format error to required copy
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 5 MB.");
      } else {
        toast.error("Formato inválido. Envie uma imagem JPG, PNG ou WEBP.");
      }
      return;
    }
    const ext = check.ext; // jpg | png | webp
    const contentType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    setUploadingAvatar(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      // Persist the storage path; we resolve a fresh signed URL on load.
      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: path } as any);
      if (dbErr) throw dbErr;
      setProfileAvatar(signed.signedUrl);
      toast.success("Foto de perfil atualizada");
    } catch (err: any) {
      toast.error(friendlyDbError(err, "Não foi possível enviar a foto."));
    } finally {
      setUploadingAvatar(false);
    }
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
            <SubscriptionCard
              onOpenAcquisition={() => { setSubscriptionInitialView("auto"); setSubscriptionOpen(true); }}
              onOpenUpgrade={() => setUpgradeOpen(true)}
              onManage={openPortal}
              managing={portalLoading}
            />

            <SettingsCard value="profile" icon={<UserIcon className="h-4 w-4" />} title="Perfil" iconTone="bg-amber-300/10 text-amber-200/90">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="h-14 w-14 ring-2 ring-border">
                    <AvatarImage src={displayedAvatar} alt={accountName} referrerPolicy="no-referrer" />
                    <AvatarFallback className="bg-primary/15 text-primary"><UserIcon className="h-6 w-6" /></AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    aria-label="Alterar foto de perfil"
                    className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md transition-transform active:scale-95 disabled:opacity-60"
                  >
                    {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />
                </div>
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

              {/* Replay onboarding tour */}
              <div className="pt-1">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.dispatchEvent(new CustomEvent("volant:open-onboarding"))}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-primary" /> Refazer tour de boas-vindas
                </Button>
              </div>

              {/* Reset onboarding (test environment only) */}
              {(() => {
                const host = typeof window !== "undefined" ? window.location.hostname : "";
                const isTestEnv =
                  host === "localhost" ||
                  host.startsWith("127.") ||
                  host.includes("id-preview--") ||
                  host.includes("lovableproject.com");
                if (!isTestEnv) return null;
                return (
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={async () => {
                        if (!user) return;
                        if (!window.confirm("Resetar onboarding? Os cadastros de veículos e a meta mensal serão apagados para simular um usuário novo.")) return;
                        const [{ error: profErr }, { error: carsErr }, { error: setErr }] = await Promise.all([
                          supabase
                            .from("profiles")
                            .update({ onboarded: false, car_onboarded: false, goal_onboarded: false } as any)
                            .eq("id", user.id),
                          supabase.from("cars").delete().eq("user_id", user.id),
                          supabase
                            .from("user_settings")
                            .update({ monthly_goal: 0, working_days_per_month: null } as any)
                            .eq("user_id", user.id),
                        ]);
                        if (profErr || carsErr || setErr) {
                          toast.error("Não foi possível resetar o onboarding.");
                          return;
                        }
                        toast.success("Onboarding resetado. Recarregando...");
                        setTimeout(() => window.location.reload(), 600);
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4 text-muted-foreground" /> Resetar onboarding (teste)
                    </Button>
                  </div>
                );
              })()}
            </SettingsCard>

            <SettingsCard value="account" icon={<Database className="h-4 w-4" />} title="Conta e dados" iconTone="bg-amber-300/10 text-amber-200/90">
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

        {/* ============== EXPERIÊNCIA ============== */}
        <SectionGroup title="Experiência">
          <PersonalizacaoRow />
        </SectionGroup>


        <SectionGroup title="Veículo">
          <CentralVeiculosRow />
        </SectionGroup>


        {/* ============== FINANCEIRO ============== */}
        <SectionGroup title="Financeiro">
          <CategoriasRow />
          <PlanejamentoInteligenteRow />
        </SectionGroup>

        {/* ============== FEEDBACK ============== */}
        <SectionGroup title="Feedback">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)]">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-400/10 text-slate-300 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
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
        <footer className="flex flex-col items-center gap-2 pt-4 pb-2 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          <img
            src={volantSymbol}
            alt={APP_NAME}
            width={20}
            height={20}
            className="mt-1 h-5 w-5 shrink-0 opacity-70"
          />
          <div>Versão {APP_VERSION_LABEL}</div>
          <div className="text-muted-foreground/60">Dados sincronizados na nuvem</div>
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
      <SubscriptionSheet
        open={subscriptionOpen}
        onOpenChange={setSubscriptionOpen}
        initialView={subscriptionInitialView}
      />
      <UpgradeToYearlyDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />

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

/** Read-only preview of weekly/daily goals derived from the monthly goal. */
function DerivedGoalsPreview({
  monthlyGoal, goalType, workingDays,
}: { monthlyGoal: number; goalType: "liquido" | "bruto"; workingDays: number | null }) {
  const { entries } = useData();
  const g = deriveGoals(monthlyGoal, entries, new Date(), { goalType, workingDays });
  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Meta semanal estimada
        </div>
        <div className="mt-1 text-base font-bold tabular-nums text-foreground">
          {g.weekly > 0 ? `R$ ${g.weekly.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}
        </div>
      </div>
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Meta diária sugerida
        </div>
        <div className="mt-1 text-base font-bold tabular-nums text-foreground">
          {g.daily > 0 ? `R$ ${g.daily.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}
        </div>
      </div>
    </div>
  );
}

/** Reusable polished navigation row used in the Settings hub. */
function HubRow({
  to, icon, title, subtitle, iconTone,
}: { to: string; icon: React.ReactNode; title: string; subtitle: string; iconTone?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-card/95 hover:border-border/80 hover:shadow-[0_1px_0_0_hsl(var(--border)),0_10px_26px_-18px_rgba(0,0,0,0.48)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 animate-fade-in"
    >
      <span className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor] transition-colors",
        iconTone || "bg-primary/10 text-primary",
      )}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight">{title}</div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground group-active:translate-x-1" />
    </button>
  );
}

function PlanejamentoInteligenteRow() {
  return (
    <HubRow
      to="/ajustes/planejamento"
      icon={<Brain className="h-4 w-4" />}
      title="Planejamento Inteligente"
      subtitle="Meta, dias de trabalho e R$/km ideal."
    />
  );
}

function CentralVeiculosRow() {
  return (
    <HubRow
      to="/ajustes/veiculos"
      icon={<Warehouse className="h-4 w-4" />}
      title="Central de Veículos"
      subtitle="Organize seus carros, custos e manutenções."
      iconTone="bg-cyan-500/10 text-cyan-300"
    />
  );
}

function PersonalizacaoRow() {
  return (
    <HubRow
      to="/ajustes/personalizacao"
      icon={<Paintbrush className="h-4 w-4" />}
      title="Personalização"
      subtitle="Aparência, saudação e organização dos cards."
      iconTone="bg-violet-400/10 text-violet-300"
    />
  );
}

function CategoriasRow() {
  return (
    <HubRow
      to="/ajustes/categorias"
      icon={<Tags className="h-4 w-4" />}
      title="Categorias"
      subtitle="Gerencie suas fontes de ganho e categorias de gasto."
    />
  );
}

