import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useData } from "@/context/DataContext";
import { useAccess } from "@/context/AccessContext";
import { AppName, Entry, EarningEntry, ExpenseCategory, MaintenanceType } from "@/types";
import { toast } from "sonner";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { CategoryDialog } from "@/components/CategoryDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Segmented } from "@/components/Segmented";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useKeyboardAwareScroll } from "@/hooks/useKeyboardAwareScroll";
import { useTour } from "@/context/TourContext";
import { HoursWheel } from "@/components/entry/HoursWheel";
import { PlatformRow, type PlatformRowData } from "@/components/entry/PlatformRow";
import { PlatformLogo } from "@/components/PlatformLogo";
import { realCurrentKm } from "@/lib/carKm";
import { brl } from "@/lib/format";

const ENTRY_DRAFT_KEY = "volant_draft_entry_v2";

interface EntryDraft {
  tab: "earning" | "expense";
  date: string;
  // earning
  platforms: PlatformRowData[];
  kmMode: "total" | "range";
  kmTotal: number | null;
  kmStart: number | null;
  kmEnd: number | null;
  hours: number | null;
  notes: string;
  // expense
  category: ExpenseCategory;
  maintenanceType: MaintenanceType;
  amount: number | null;
  description: string;
}

interface EntryDrawerPreset {
  tab?: "earning" | "expense";
  category?: ExpenseCategory;
  editing?: Entry | null;
  /** Editar uma sessão multi-plataforma: passa todas as linhas do grupo. */
  editingGroup?: EarningEntry[];
  onAfterSave?: () => void;
  prefillHours?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset?: EntryDrawerPreset | null;
}

const newRow = (app: string): PlatformRowData => ({
  uid: crypto.randomUUID(),
  app,
  gross: null,
  rides: null,
});

export function EntryDrawer({ open, onOpenChange, preset }: Props) {
  const {
    addEntry, addEntries, updateEntry, removeEntry, removeGroup,
    entries, activeCar,
    expenseCategories, earningPlatforms, isSimplePlatform,
  } = useData();
  const { requirePremium } = useAccess();
  const { notifyAction, activeTour } = useTour();
  const tourLocksDrawer = activeTour === "earnings" || activeTour === "expenses";
  const [platDialogOpen, setPlatDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);
  const editing = preset?.editing || null;
  const editingGroup = preset?.editingGroup || null;
  const tab: "earning" | "expense" =
    editing ? editing.type
    : editingGroup ? "earning"
    : (preset?.tab || "earning");
  const isEditing = !!editing || !!editingGroup;

  // EARNING state
  const [platforms, setPlatforms] = useState<PlatformRowData[]>([newRow("uber")]);
  const [kmMode, setKmMode] = useState<"total" | "range">("total");
  const [kmTotal, setKmTotal] = useState<number | null>(null);
  const [kmStart, setKmStart] = useState<number | null>(null);
  const [kmEnd, setKmEnd] = useState<number | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [addedExtra, setAddedExtra] = useState(false);

  // EXPENSE state
  const [category, setCategory] = useState<ExpenseCategory>("combustivel");
  const [amount, setAmount] = useState<number | null>(null);
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("oleo");
  const [description, setDescription] = useState("");

  // Última plataforma usada (sugestão inicial)
  const lastUsedPlatform = useMemo(() => {
    const last = entries.find((e) => e.type === "earning") as EarningEntry | undefined;
    return last?.app && earningPlatforms.some((p) => p.key === last.app && p.type === "ride")
      ? last.app
      : "uber";
  }, [entries, earningPlatforms]);

  // Sugestão de odômetro inicial (KM real atual do carro)
  const suggestedStartKm = useMemo(() => {
    return activeCar ? Math.round(realCurrentKm(activeCar, entries)) : 0;
  }, [activeCar, entries]);

  // ───── Draft persistence (criação nova) ─────
  const draftValue: EntryDraft = {
    tab, date: date.toISOString(),
    platforms, kmMode, kmTotal, kmStart, kmEnd, hours, notes,
    category, maintenanceType, amount, description,
  };
  const draftEnabled = open && !isEditing && !preset?.prefillHours;
  const draftRef = useDraftPersistence<EntryDraft>(ENTRY_DRAFT_KEY, draftValue, {
    enabled: draftEnabled, storage: "session",
  });
  const restoredOnceRef = useRef(false);

  // Aplicar preset/edição ao abrir
  useEffect(() => {
    if (!open) { restoredOnceRef.current = false; return; }

    // Edição de uma sessão multi-plataforma
    if (editingGroup && editingGroup.length > 0) {
      const sorted = [...editingGroup].sort((a, b) => +new Date(a.date) - +new Date(b.date));
      const anchor = sorted[0];
      setDate(new Date(anchor.date));
      setPlatforms(sorted.map((e) => ({
        uid: crypto.randomUUID(),
        app: e.app,
        gross: e.gross || null,
        rides: e.rides ?? null,
      })));
      setKmMode("total");
      setKmTotal(anchor.km || null);
      setKmStart(null); setKmEnd(null);
      setHours(anchor.hours || null);
      setNotes(anchor.notes || "");
      setAddedExtra(true);
      return;
    }

    // Edição de uma entrada isolada
    if (editing) {
      setDate(new Date(editing.date));
      if (editing.type === "earning") {
        setPlatforms([{
          uid: crypto.randomUUID(), app: editing.app,
          gross: editing.gross || null, rides: editing.rides ?? null,
        }]);
        setKmMode("total");
        setKmTotal(editing.km || null);
        setKmStart(null); setKmEnd(null);
        setHours(editing.hours || null);
        setNotes(editing.notes || "");
        setAddedExtra(false);
      } else {
        setCategory(editing.expense.category);
        setAmount(editing.expense.amount || null);
        setMaintenanceType(editing.expense.maintenanceType || "oleo");
        setDescription(editing.expense.description || "");
      }
      return;
    }

    // NOVO REGISTRO — limpar e aplicar preset
    setDate(new Date());
    setPlatforms([newRow(lastUsedPlatform)]);
    setAddedExtra(false);
    setKmMode("total"); setKmTotal(null); setKmStart(null); setKmEnd(null);
    setHours(null); setNotes("");
    setAmount(null); setDescription(""); setMaintenanceType("oleo");
    if (preset?.category) setCategory(preset.category); else setCategory("combustivel");
    if (preset?.prefillHours !== undefined && preset.prefillHours > 0) {
      setHours(Math.round(preset.prefillHours * 100) / 100);
    }

    // Restaurar rascunho (uma vez) — tolerante a formato antigo
    if (!restoredOnceRef.current && !preset?.prefillHours) {
      restoredOnceRef.current = true;
      const saved = draftRef.load() as Partial<EntryDraft> & { app?: string; gross?: number | null; rides?: number | null } | null;
      if (saved) {
        try {
          if (saved.date) setDate(new Date(saved.date));
          // Compat: rascunho antigo guardava app/gross/rides no topo
          if (Array.isArray(saved.platforms) && saved.platforms.length > 0) {
            setPlatforms(saved.platforms.map((p) => ({
              uid: p.uid || crypto.randomUUID(),
              app: p.app || lastUsedPlatform,
              gross: p.gross ?? null,
              rides: p.rides ?? null,
            })));
            setAddedExtra(saved.platforms.length > 1);
          } else if (saved.app) {
            setPlatforms([{
              uid: crypto.randomUUID(),
              app: saved.app,
              gross: saved.gross ?? null,
              rides: saved.rides ?? null,
            }]);
          }
          setKmMode(saved.kmMode ?? "total");
          setKmTotal(saved.kmTotal ?? null);
          setKmStart(saved.kmStart ?? null);
          setKmEnd(saved.kmEnd ?? null);
          setHours(saved.hours ?? null);
          setNotes(saved.notes ?? "");
          if (!preset?.category) setCategory(saved.category ?? "combustivel");
          setMaintenanceType(saved.maintenanceType ?? "oleo");
          setAmount(saved.amount ?? null);
          setDescription(saved.description ?? "");
        } catch { /* noop */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset, editing, editingGroup, lastUsedPlatform]);

  const reset = () => {
    setPlatforms([newRow(lastUsedPlatform)]);
    setAddedExtra(false);
    setKmTotal(null); setKmStart(null); setKmEnd(null);
    setHours(null); setNotes("");
    setAmount(null); setDescription("");
    setDate(new Date());
    draftRef.clear();
  };

  // Plataforma principal define se é receita simples
  const primaryPlatform = platforms[0]?.app || "uber";
  const isSimple = isSimplePlatform(primaryPlatform);

  const usedKeys = platforms.map((p) => p.app);
  const totalGross = platforms.reduce((s, p) => s + (p.gross || 0), 0);
  const liveKm = kmMode === "range" && kmStart != null && kmEnd != null
    ? Math.max(0, kmEnd - kmStart)
    : null;

  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [pendingAppend, setPendingAppend] = useState(false);
  const [pendingSimpleKey, setPendingSimpleKey] = useState<string | null>(null);

  const unusedPlatforms = earningPlatforms.filter((p) => p.type === "ride" && !usedKeys.includes(p.key));
  const simplePlatforms = earningPlatforms.filter((p) => p.type === "simple");

  const switchToSimple = (key: string) => {
    setPlatforms([newRow(key)]);
    setAddedExtra(false);
  };

  // Debounce dos avanços do tour: evita pular etapa enquanto o usuário ainda está
  // completando o campo (girar horas + ajustar minutos, digitar "150" sem pular no "1").
  const advanceTimers = useRef<Record<string, number>>({});
  useEffect(() => () => {
    Object.values(advanceTimers.current).forEach((t) => window.clearTimeout(t));
    advanceTimers.current = {};
  }, []);
  const debouncedNotify = (actionId: string, ready: boolean, delay = 900) => {
    const existing = advanceTimers.current[actionId];
    if (existing) window.clearTimeout(existing);
    if (!ready) { delete advanceTimers.current[actionId]; return; }
    advanceTimers.current[actionId] = window.setTimeout(() => {
      notifyAction(actionId);
      delete advanceTimers.current[actionId];
    }, delay);
  };

  // Preenchimentos contínuos (roda de horas, digitação de km/valores) usam
  // debounce mais generoso pra dar tempo de ajustar horas + minutos, ou digitar
  // "150" sem disparar no "1". Toque único (categoria) usa o padrão de 900ms.
  const SLOW_DEBOUNCE = 1400;

  const notifyFilledHours = (next: number | null) => {
    debouncedNotify("filled-hours", (next ?? 0) > 0, SLOW_DEBOUNCE);
  };

  const notifyFilledKm = (next: number | null, field: "total" | "start" | "end") => {
    const nextTotal = field === "total" ? next : kmTotal;
    const nextStart = field === "start" ? next : kmStart;
    const nextEnd = field === "end" ? next : kmEnd;
    const hasTotal = kmMode === "total" && (nextTotal ?? 0) > 0;
    const hasRange = kmMode === "range" && nextStart != null && nextEnd != null && nextEnd > nextStart;
    debouncedNotify("filled-km", hasTotal || hasRange, SLOW_DEBOUNCE);
  };

  const notifyFilledEarningValues = (nextPlatforms: PlatformRowData[]) => {
    const hasValidRow = nextPlatforms.some((p) => (p.gross ?? 0) > 0 && (p.rides ?? 0) > 0);
    debouncedNotify("filled-earning-values", hasValidRow, SLOW_DEBOUNCE);
  };

  const notifyFilledSecondPlatform = (nextPlatforms: PlatformRowData[]) => {
    const validRows = nextPlatforms.filter((p) => (p.gross ?? 0) > 0 && (p.rides ?? 0) > 0);
    debouncedNotify("filled-second-platform", validRows.length >= 2, SLOW_DEBOUNCE);
  };

  const notifyFilledExpenseValue = (next: number | null) => {
    debouncedNotify("filled-expense-value", (next ?? 0) > 0, SLOW_DEBOUNCE);
  };


  const requestSwitchToSimple = (key: string) => {
    const hasContent = platforms.some((p) => (p.gross || 0) > 0 || (p.rides || 0) > 0);
    if (hasContent) setPendingSimpleKey(key);
    else switchToSimple(key);
  };

  const submit = async () => {
    if (submitting) return;
    if (!requirePremium()) { onOpenChange(false); return; }
    const now = new Date();
    const chosen = new Date(date);
    if (!isEditing) chosen.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    const dateIso = chosen.toISOString();

    setSubmitting(true);
    try {
      // ─────── GASTO ───────
      if (tab === "expense") {
        const a = amount ?? 0;
        if (a <= 0) { toast.error("Informe o valor do gasto"); return; }
        const isMaint = category === "manutencao";
        if (editing && editing.type === "expense") {
          await updateEntry({
            ...editing, date: dateIso,
            expense: { category, amount: a, description, maintenanceType: isMaint ? maintenanceType : undefined },
          });
          toast.success("Gasto atualizado!");
        } else {
          await addEntry({
            id: crypto.randomUUID(), type: "expense", date: dateIso,
            expense: { category, amount: a, description, maintenanceType: isMaint ? maintenanceType : undefined },
          });
          if (isMaint && (maintenanceType === "oleo" || maintenanceType === "pneus")) {
            toast.success("Gasto registrado!", {
              description: "Quer atualizar o KM da última troca para o acompanhamento?",
              action: {
                label: "Atualizar",
                onClick: () => window.location.assign(`/ajustes/veiculos/manutencao#${maintenanceType}`),
              },
              duration: 6000,
            });
          } else {
            toast.success("Gasto registrado!");
          }
        }
        const cb = preset?.onAfterSave;
        const wasMaint = isMaint;
        notifyAction("saved-expense");
        reset(); onOpenChange(false);
        if (wasMaint && cb) cb();
        return;
      }

      // ─────── GANHO ───────
      // Calcular KM/horas (receita simples zera)
      const km = isSimple ? 0 : (kmMode === "total"
        ? (kmTotal ?? 0)
        : Math.max(0, (kmEnd ?? 0) - (kmStart ?? 0)));
      const h = isSimple ? 0 : (hours ?? 0);

      // Linhas válidas (valor > 0)
      const valid = platforms.filter((p) => (p.gross || 0) > 0);
      if (valid.length === 0) { toast.error("Informe o valor recebido"); return; }

      // Receita simples sempre 1 linha sem grupo
      if (isSimple) {
        const r = valid[0];
        const entry: EarningEntry = {
          id: crypto.randomUUID(), type: "earning", date: dateIso,
          app: r.app, km: 0, hours: 0, gross: r.gross || 0, notes,
        };
        // Em edição de uma entrada simples isolada
        if (editing && editing.type === "earning" && !editingGroup) {
          await updateEntry({ ...editing, date: dateIso, app: r.app, km: 0, hours: 0, gross: r.gross || 0, rides: undefined, notes });
        } else if (editingGroup) {
          // Sessão virou simples → insert + remove do grupo antigo (insert primeiro)
          await addEntries([entry]);
          try { await removeGroup(editingGroup[0].groupId!); } catch { /* duplicado recuperável */ }
        } else {
          await addEntry(entry);
        }
        toast.success(isEditing ? "Registro atualizado!" : "Ganho registrado!");
        notifyAction("saved-earning");
        reset(); onOpenChange(false);
        return;
      }

      // Multi-plataforma operacional
      // 1 plataforma válida → sem grupo
      if (valid.length === 1) {
        const r = valid[0];
        const single: EarningEntry = {
          id: crypto.randomUUID(), type: "earning", date: dateIso,
          app: r.app, km, hours: h, gross: r.gross || 0,
          rides: (r.rides || 0) > 0 ? (r.rides as number) : undefined,
          notes,
        };
        if (editing && editing.type === "earning" && !editingGroup) {
          await updateEntry({
            ...editing, date: dateIso, app: r.app, km, hours: h,
            gross: r.gross || 0,
            rides: (r.rides || 0) > 0 ? (r.rides as number) : undefined,
            notes,
          });
        } else if (editingGroup) {
          // Colapso de grupo → 1 linha: insert primeiro, depois remove o grupo antigo
          await addEntries([single]);
          try { await removeGroup(editingGroup[0].groupId!); } catch { /* duplicado recuperável */ }
        } else {
          await addEntry(single);
        }
      } else {
        // 2+ → sessão com group_id NOVO (mesmo em edição)
        const groupId = crypto.randomUUID();
        const sessionEntries: EarningEntry[] = valid.map((r, idx) => ({
          id: crypto.randomUUID(),
          type: "earning",
          date: dateIso,
          app: r.app,
          km: idx === 0 ? km : 0,
          hours: idx === 0 ? h : 0,
          gross: r.gross || 0,
          rides: (r.rides || 0) > 0 ? (r.rides as number) : undefined,
          notes: idx === 0 ? (notes || undefined) : undefined,
          groupId,
        }));
        // ORDEM SEGURA: insert antes, delete depois
        await addEntries(sessionEntries);
        if (editingGroup) {
          try { await removeGroup(editingGroup[0].groupId!); } catch { /* duplicado recuperável */ }
        } else if (editing && editing.type === "earning") {
          // Linha isolada virou sessão — remove a antiga DEPOIS do insert ok
          try { await removeEntry(editing.id); } catch { /* duplicado recuperável */ }
        }
      }

      toast.success(isEditing ? "Jornada atualizada!" : "Ganho registrado!");
      notifyAction("saved-earning");
      reset(); onOpenChange(false);
    } catch (err) {
      console.error("[entry save]", err);
      toast.error("Não foi possível salvar. Revise as informações e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const { ref: scrollRef, keyboardHeight } = useKeyboardAwareScroll<HTMLDivElement>();
  const titleText = isEditing
    ? (tab === "earning" ? "Editar jornada" : "Editar gasto")
    : (tab === "earning" ? "Novo ganho" : "Novo gasto");

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v && tourLocksDrawer) return; onOpenChange(v); if (!v) reset(); }} dismissible={false} repositionInputs={false} modal={false}>
      <DrawerContent
        className={cn(
          "flex flex-col",
          tab === "earning" ? "h-[100dvh] max-h-[100dvh]" : "max-h-[92dvh]",
        )}
        style={
          tab === "earning" && keyboardHeight > 0
            ? { height: `calc(100dvh - ${keyboardHeight}px)`, maxHeight: `calc(100dvh - ${keyboardHeight}px)` }
            : undefined
        }
      >
        <div className="mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col">
          <DrawerHeader className="pb-2 shrink-0">
            <DrawerTitle>{titleText}</DrawerTitle>
          </DrawerHeader>

          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4"
            style={{
              WebkitOverflowScrolling: "touch",
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 24 : undefined,
            }}
          >
            {/* Data — compartilhada */}
            <div className="mb-4 space-y-2">
              <Label>Data do registro</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (!d) return;
                      const merged = new Date(d);
                      merged.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
                      setDate(merged);
                    }}
                    disabled={(d) => d > new Date()}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {tab === "earning" ? (
              <div className="space-y-5">
                {!isSimple && (
                  <>
                    <div>
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        A jornada
                      </div>
                      <div className="grid gap-4">
                        {/* Horas */}
                        <div className="space-y-2" data-tour="entry-hours">
                          <Label className="text-xs">Horas trabalhadas</Label>
                          <HoursWheel
                            value={hours}
                            onChange={(v) => {
                              setHours(v);
                              notifyFilledHours(v);
                            }}
                          />
                        </div>

                        {/* Quilometragem */}
                        <div className="space-y-2" data-tour="entry-km">
                          <Label className="text-xs">Quilometragem</Label>
                          <Segmented
                            options={[{ key: "total", label: "Total" }, { key: "range", label: "Inicial / Final" }]}
                            value={kmMode}
                            onChange={(v) => setKmMode(v as "total" | "range")}
                            tone="flat"
                            size="sm"
                          />
                          {kmMode === "total" ? (
                            <NumberField
                              placeholder="Km rodados"
                              value={kmTotal}
                              onChange={(v) => {
                                setKmTotal(v);
                                notifyFilledKm(v, "total");
                              }}
                            />
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <div className="text-[10px] text-muted-foreground">
                                    KM inicial {suggestedStartKm > 0 && (
                                      <button
                                        type="button"
                                          onClick={() => {
                                            setKmStart(suggestedStartKm);
                                            notifyFilledKm(suggestedStartKm, "start");
                                          }}
                                        className="ml-1 font-medium text-primary hover:underline"
                                      >
                                        Usar {suggestedStartKm.toLocaleString("pt-BR")} km
                                      </button>
                                    )}
                                  </div>
                                  <NumberField
                                    placeholder={suggestedStartKm > 0 ? String(suggestedStartKm) : "Km inicial"}
                                    value={kmStart}
                                    onChange={(v) => {
                                      setKmStart(v);
                                      notifyFilledKm(v, "start");
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] text-muted-foreground">KM final</div>
                                  <NumberField
                                    placeholder="Km final"
                                    value={kmEnd}
                                    onChange={(v) => {
                                      setKmEnd(v);
                                      notifyFilledKm(v, "end");
                                    }}
                                  />
                                </div>
                              </div>
                              {liveKm !== null && liveKm > 0 && (
                                <div className="text-right text-[11px] font-medium text-muted-foreground">
                                  Rodou <span className="font-bold text-foreground">{liveKm.toLocaleString("pt-BR")} km</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lista de plataformas */}
                    <div data-tour="entry-earning-value">
                      <div className="mb-3 text-sm font-bold text-foreground">
                        Em quais apps você rodou hoje?
                      </div>
                      <div className="space-y-2">
                        {platforms.map((row, idx) => {
                          const isLastRow = idx === platforms.length - 1;
                          return (
                            <div
                              key={row.uid}
                              data-tour={isLastRow && platforms.length > 1 ? "entry-platform-last" : undefined}
                            >
                              <PlatformRow
                                row={row}
                                usedKeys={usedKeys}
                                hideRemove={platforms.length === 1}
                                onChange={(next) => {
                                  const arr = [...platforms];
                                  arr[idx] = next;
                                  setPlatforms(arr);
                                  notifyFilledEarningValues(arr);
                                  notifyFilledSecondPlatform(arr);
                                }}
                                onRemove={() => {
                                  setPlatforms(platforms.filter((_, i) => i !== idx));
                                }}
                                onCreateNewPlatform={() => setPlatDialogOpen(true)}
                              />
                            </div>
                          );
                        })}


                        <Select
                          onOpenChange={(v) => { if (v) notifyAction("opened-add-platform"); }}
                          onValueChange={(v) => {
                            if (v === "__new__") {
                                notifyAction("used-add-platform");
                              setPendingAppend(true);
                              setPlatDialogOpen(true);
                              return;
                            }
                            if (simplePlatforms.some((p) => p.key === v)) {
                                notifyAction("used-add-platform");
                              requestSwitchToSimple(v);
                              return;
                            }
                            setPlatforms([...platforms, newRow(v)]);
                            setAddedExtra(true);
                              notifyAction("used-add-platform");
                          }}
                        >
                          <SelectTrigger
                            data-tour="entry-add-platform"
                            className={cn(
                              "flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-success hover:text-success hover:bg-success/5 focus:ring-0",
                              platforms.length === 1 && "animate-breath",
                            )}
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success">
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                            Adicionar plataforma
                          </SelectTrigger>
                          <SelectContent data-tour="entry-add-platform-list">

                            {unusedPlatforms.length > 0 && (
                              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                Plataformas operacionais
                              </div>
                            )}
                            {unusedPlatforms.map((p) => (
                              <SelectItem key={p.key} value={p.key}>
                                <div className="flex items-center gap-2.5">
                                  <PlatformLogo platformKey={p.key} label={p.label} hex={p.hex} imageUrl={p.imageUrl} size="sm" />
                                  <span>{p.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                            {unusedPlatforms.length === 0 && (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">Todas as plataformas já adicionadas</div>
                            )}
                            {simplePlatforms.length > 0 && (
                              <>
                                <div className="mt-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                  Receitas simples
                                </div>
                                {simplePlatforms.map((p) => (
                                  <SelectItem key={p.key} value={p.key}>
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-base leading-none">{p.emoji}</span>
                                      <span>{p.label}</span>
                                      <span className="ml-1 rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Ganho avulso
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            <SelectItem value="__new__">
                              <div className="flex items-center gap-2 text-primary">
                                <Plus className="h-4 w-4" /> Criar nova plataforma
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>


                        {totalGross > 0 && platforms.length > 1 && (
                          <div className="flex items-center justify-between rounded-xl bg-success/10 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Total do dia</span>
                            <span className="text-base font-bold text-success">{brl(totalGross)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Receita simples */}
                {isSimple && (
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select value={primaryPlatform} onValueChange={(v) => {
                      setPlatforms([{ ...platforms[0], app: v }]);
                    }}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {earningPlatforms.map((p) => (
                          <SelectItem key={p.key} value={p.key}>
                            <span className="mr-2">{p.emoji}</span>{p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Label>Valor recebido</Label>
                    <NumberField
                      currency
                      value={platforms[0]?.gross ?? null}
                      onChange={(v) => setPlatforms([{ ...platforms[0], gross: v }])}
                      className="h-12 text-lg font-bold"
                    />
                  </div>
                )}

                {/* Observações */}
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Observações
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Opcional"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              // ─── GASTO ───
              <div className="space-y-4">
                <div className="space-y-2" data-tour="entry-expense-category">
                  <div className="flex items-center justify-between">
                    <Label>Categoria</Label>
                    <button type="button" onClick={() => setCatDialogOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Plus className="h-3 w-3" /> Nova categoria
                    </button>
                  </div>
                  <Select
                    value={category}
                    onOpenChange={(v) => {
                      if (v) notifyAction("opened-expense-category");
                    }}
                    onValueChange={(v) => {
                      setCategory(v as ExpenseCategory);
                      notifyAction("selected-expense-category");
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent data-tour="entry-expense-category-list">
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          <span className="mr-2">{c.emoji}</span>{c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {category === "manutencao" && (
                  <div className="space-y-2">
                    <Label>Tipo de manutenção</Label>
                    <Select value={maintenanceType} onValueChange={(v) => setMaintenanceType(v as MaintenanceType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oleo">Troca de óleo</SelectItem>
                        <SelectItem value="bateria">Bateria</SelectItem>
                        <SelectItem value="pneus">Pneus</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Valor herói — vermelho */}
                <div className="space-y-2">
                  <Label className="text-center block">Valor do gasto</Label>
                  <div data-tour="entry-expense-value" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                    <NumberField
                      currency
                      value={amount}
                      onChange={(v) => {
                        setAmount(v);
                        notifyFilledExpenseValue(v);
                      }}
                      className="h-14 border-0 bg-transparent text-center text-2xl font-bold text-destructive shadow-none focus-visible:ring-0 [&]:pl-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea rows={2} placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t bg-background px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex gap-2">
            {!tourLocksDrawer && (
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            )}
            <Button data-tour="entry-save" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={submit} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
              ) : (
                isEditing ? "Salvar alterações" : "Salvar"
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
      <CategoryDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        type="expense"
        onCreated={(key) => setCategory(key as ExpenseCategory)}
      />
      <CategoryDialog
        open={platDialogOpen}
        onOpenChange={(v) => {
          setPlatDialogOpen(v);
          if (!v) setPendingAppend(false);
        }}
        type="earning"
        onCreated={(key) => {
          if (pendingAppend) {
            setPlatforms((prev) => [...prev, newRow(key)]);
            setAddedExtra(true);
            setPendingAppend(false);
          } else {
            const idx = platforms.findIndex((p) => !p.gross);
            const target = idx >= 0 ? idx : 0;
            const arr = [...platforms];
            arr[target] = { ...arr[target], app: key as AppName };
            setPlatforms(arr);
          }
        }}
      />
      <AlertDialog open={pendingSimpleKey !== null} onOpenChange={(v) => { if (!v) setPendingSimpleKey(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar para receita simples?</AlertDialogTitle>
            <AlertDialogDescription>
              Ganhos avulsos não usam KM, horas ou corridas. A jornada em andamento será descartada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter jornada</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingSimpleKey) switchToSimple(pendingSimpleKey);
                setPendingSimpleKey(null);
              }}
            >
              Trocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>
  );
}
