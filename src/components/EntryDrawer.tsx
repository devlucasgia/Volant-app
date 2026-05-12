import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useData } from "@/context/DataContext";
import { AppName, Entry, ExpenseCategory, MaintenanceType } from "@/types";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, CalendarIcon, Plus } from "lucide-react";
import { CategoryDialog } from "@/components/CategoryDialog";
import { PlatformLogo } from "@/components/PlatformLogo";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EntryDrawerPreset {
  tab?: "earning" | "expense";
  category?: ExpenseCategory;
  editing?: Entry | null;
  onAfterSave?: () => void;
  prefillHours?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset?: EntryDrawerPreset | null;
}

export function EntryDrawer({ open, onOpenChange, preset }: Props) {
  const { addEntry, updateEntry, expenseCategories, earningPlatforms } = useData();
  const [platDialogOpen, setPlatDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [tab, setTab] = useState<"earning" | "expense">("earning");
  const [date, setDate] = useState<Date>(new Date());
  const editing = preset?.editing || null;
  const isEditing = !!editing;

  // earning state
  const [app, setApp] = useState<AppName>("uber");
  const [kmMode, setKmMode] = useState<"total" | "range">("total");
  const [kmTotal, setKmTotal] = useState<number | null>(null);
  const [kmStart, setKmStart] = useState<number | null>(null);
  const [kmEnd, setKmEnd] = useState<number | null>(null);
  const [hours, setHours] = useState<number | null>(null);
  const [gross, setGross] = useState<number | null>(null);
  const [rides, setRides] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // expense state
  const [category, setCategory] = useState<ExpenseCategory>("combustivel");
  const [amount, setAmount] = useState<number | null>(null);
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("oleo");
  const [description, setDescription] = useState("");

  // Apply preset / editing on open
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(new Date(editing.date));
      if (editing.type === "earning") {
        setTab("earning");
        setApp(editing.app);
        setKmMode("total");
        setKmTotal(editing.km || null);
        setKmStart(null); setKmEnd(null);
        setHours(editing.hours || null);
        setGross(editing.gross || null);
        setRides(editing.rides ?? null);
        setNotes(editing.notes || "");
      } else {
        setTab("expense");
        setCategory(editing.expense.category);
        setAmount(editing.expense.amount || null);
        setMaintenanceType(editing.expense.maintenanceType || "oleo");
        setDescription(editing.expense.description || "");
      }
      return;
    }
    if (preset?.tab) setTab(preset.tab);
    if (preset?.category) setCategory(preset.category);
  }, [open, preset, editing]);

  const reset = () => {
    setKmTotal(null); setKmStart(null); setKmEnd(null);
    setHours(null); setGross(null); setRides(null); setNotes("");
    setAmount(null); setDescription("");
    setDate(new Date());
  };

  const submit = async () => {
    const now = new Date();
    const chosen = new Date(date);
    if (!isEditing) chosen.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    const dateIso = chosen.toISOString();

    const km = kmMode === "total"
      ? (kmTotal ?? 0)
      : Math.max(0, (kmEnd ?? 0) - (kmStart ?? 0));
    const h = hours ?? 0;
    const g = gross ?? 0;
    const r = rides ?? 0;
    const a = amount ?? 0;

    try {
      if (isEditing && editing) {
        if (editing.type === "earning") {
          if (g <= 0) return toast.error("Informe o valor recebido");
          await updateEntry({
            ...editing, date: dateIso, app, km, hours: h, gross: g,
            rides: r > 0 ? r : undefined, notes,
          });
        } else {
          if (a <= 0) return toast.error("Informe o valor do gasto");
          const isMaint = category === "manutencao";
          await updateEntry({
            ...editing, date: dateIso,
            expense: { category, amount: a, description, maintenanceType: isMaint ? maintenanceType : undefined },
          });
        }
        toast.success("Registro atualizado!");
        reset();
        onOpenChange(false);
        return;
      }

      const hasEarning = g > 0 || km > 0 || h > 0;
      const hasExpense = a > 0;

      if (!hasEarning && !hasExpense) {
        return toast.error("Preencha um ganho ou um gasto");
      }
      const tasks: Promise<void>[] = [];
      if (hasEarning) {
        if (g <= 0) return toast.error("Informe o valor recebido");
        tasks.push(addEntry({
          id: crypto.randomUUID(), type: "earning", date: dateIso,
          app, km, hours: h, gross: g, rides: r > 0 ? r : undefined, notes,
        }));
      }
      if (hasExpense) {
        const isMaint = category === "manutencao";
        tasks.push(addEntry({
          id: crypto.randomUUID(), type: "expense", date: dateIso,
          expense: { category, amount: a, description,
            maintenanceType: isMaint ? maintenanceType : undefined },
        }));
      }
      await Promise.all(tasks);
      toast.success(
        hasEarning && hasExpense ? "Ganho e gasto registrados!" :
        hasEarning ? "Ganho registrado!" : "Gasto registrado!"
      );
      const cb = preset?.onAfterSave;
      const wasMaint = hasExpense && category === "manutencao";
      reset();
      onOpenChange(false);
      if (wasMaint && cb) cb();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "tente novamente"));
    }
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DrawerContent className="max-h-[92dvh] flex flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col">
          <DrawerHeader className="pb-2 shrink-0">
            <DrawerTitle>{isEditing ? "Editar registro" : "Novo registro"}</DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="mb-4 space-y-2">
              <Label>Data do registro</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    disabled={(d) => d > new Date()}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Tabs value={tab} onValueChange={(v) => !isEditing && setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="earning" className="gap-2" disabled={isEditing && editing?.type !== "earning"}>
                  <TrendingUp className="h-4 w-4" /> Lucro
                </TabsTrigger>
                <TabsTrigger value="expense" className="gap-2" disabled={isEditing && editing?.type !== "expense"}>
                  <TrendingDown className="h-4 w-4" /> Gasto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="earning" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Plataforma</Label>
                    <button type="button" onClick={() => setPlatDialogOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Plus className="h-3 w-3" /> Nova plataforma
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {earningPlatforms.map((p) => {
                      const selected = app === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setApp(p.key)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-xs font-semibold transition-all bg-card",
                            selected ? "border-primary ring-2 ring-primary/30" : "border-border opacity-80"
                          )}
                        >
                          <PlatformLogo platformKey={p.key} label={p.label} hex={p.hex} size="sm" />
                          <span className="truncate text-foreground">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Quilometragem</Label>
                    <div className="flex rounded-md bg-muted p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setKmMode("total")}
                        className={cn("rounded px-2 py-1", kmMode === "total" && "bg-card shadow-sm")}
                      >Total</button>
                      <button
                        type="button"
                        onClick={() => setKmMode("range")}
                        className={cn("rounded px-2 py-1", kmMode === "range" && "bg-card shadow-sm")}
                      >Inicial/Final</button>
                    </div>
                  </div>
                  {kmMode === "total" ? (
                    <NumberField placeholder="Km rodados" value={kmTotal} onChange={setKmTotal} />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField placeholder="Km inicial" value={kmStart} onChange={setKmStart} />
                      <NumberField placeholder="Km final" value={kmEnd} onChange={setKmEnd} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Horas trabalhadas</Label>
                    <NumberField placeholder="Ex: 6.5" value={hours} onChange={setHours} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor recebido</Label>
                    <NumberField placeholder="R$" value={gross} onChange={setGross} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade de corridas</Label>
                  <NumberField placeholder="Opcional" value={rides} onChange={setRides} decimal={false} />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea rows={2} placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="expense" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Categoria</Label>
                    <button type="button" onClick={() => setCatDialogOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Plus className="h-3 w-3" /> Nova categoria
                    </button>
                  </div>
                  <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
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

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <NumberField placeholder="R$" value={amount} onChange={setAmount} />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea rows={2} placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="shrink-0 border-t bg-background px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1 gradient-success text-primary-foreground" onClick={submit}>
              {isEditing ? "Salvar alterações" : "Salvar"}
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
        onOpenChange={setPlatDialogOpen}
        type="earning"
        onCreated={(key) => setApp(key as AppName)}
      />
    </Drawer>
  );
}
