import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useData } from "@/context/DataContext";
import { AppName, APP_META, ExpenseCategory, EXPENSE_META, MaintenanceType } from "@/types";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EntryDrawerPreset {
  tab?: "earning" | "expense";
  category?: ExpenseCategory;
  onAfterSave?: () => void;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset?: EntryDrawerPreset | null;
}

export function EntryDrawer({ open, onOpenChange, preset }: Props) {
  const { addEntry } = useData();
  const [tab, setTab] = useState<"earning" | "expense">("earning");
  const [date, setDate] = useState<Date>(new Date());

  // earning state
  const [app, setApp] = useState<AppName>("uber");
  const [kmMode, setKmMode] = useState<"total" | "range">("total");
  const [kmTotal, setKmTotal] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [hours, setHours] = useState("");
  const [gross, setGross] = useState("");
  const [notes, setNotes] = useState("");

  // expense state
  const [category, setCategory] = useState<ExpenseCategory>("combustivel");
  const [amount, setAmount] = useState("");
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("oleo");
  const [description, setDescription] = useState("");

  // Apply preset when drawer opens
  useEffect(() => {
    if (open && preset) {
      if (preset.tab) setTab(preset.tab);
      if (preset.category) setCategory(preset.category);
    }
  }, [open, preset]);

  const reset = () => {
    setKmTotal(""); setKmStart(""); setKmEnd(""); setHours(""); setGross(""); setNotes("");
    setAmount(""); setDescription("");
    setDate(new Date());
  };

  const submit = async () => {
    const now = new Date();
    const chosen = new Date(date);
    chosen.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    const dateIso = chosen.toISOString();

    const km = kmMode === "total"
      ? parseFloat(kmTotal) || 0
      : Math.max(0, (parseFloat(kmEnd) || 0) - (parseFloat(kmStart) || 0));
    const h = parseFloat(hours) || 0;
    const g = parseFloat(gross) || 0;
    const a = parseFloat(amount) || 0;

    const hasEarning = g > 0 || km > 0 || h > 0;
    const hasExpense = a > 0;

    if (!hasEarning && !hasExpense) {
      return toast.error("Preencha um ganho ou um gasto");
    }

    try {
      const tasks: Promise<void>[] = [];
      if (hasEarning) {
        if (g <= 0) return toast.error("Informe o valor recebido");
        tasks.push(addEntry({
          id: crypto.randomUUID(), type: "earning", date: dateIso,
          app, km, hours: h, gross: g, notes,
        }));
      }
      if (hasExpense) {
        const isMaint = category === "manutencao" || category === "manutencao_preventiva";
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
      const wasPreventive = hasExpense && category === "manutencao_preventiva";
      reset();
      onOpenChange(false);
      if (wasPreventive && cb) cb();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "tente novamente"));
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="pb-2">
            <DrawerTitle>Novo registro</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6">
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

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="earning" className="gap-2">
                  <TrendingUp className="h-4 w-4" /> Lucro
                </TabsTrigger>
                <TabsTrigger value="expense" className="gap-2">
                  <TrendingDown className="h-4 w-4" /> Gasto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="earning" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Aplicativo</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(APP_META) as AppName[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setApp(k)}
                        className={cn(
                          "rounded-lg border-2 px-2 py-2.5 text-xs font-semibold transition-all",
                          APP_META[k].colorClass,
                          app === k ? "border-primary ring-2 ring-primary/40" : "border-transparent opacity-60"
                        )}
                      >
                        {APP_META[k].label}
                      </button>
                    ))}
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
                    <Input type="number" inputMode="decimal" placeholder="Km rodados" value={kmTotal} onChange={(e) => setKmTotal(e.target.value)} />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" inputMode="decimal" placeholder="Km inicial" value={kmStart} onChange={(e) => setKmStart(e.target.value)} />
                      <Input type="number" inputMode="decimal" placeholder="Km final" value={kmEnd} onChange={(e) => setKmEnd(e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Horas trabalhadas</Label>
                    <Input type="number" inputMode="decimal" placeholder="Ex: 6.5" value={hours} onChange={(e) => setHours(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor recebido</Label>
                    <Input type="number" inputMode="decimal" placeholder="R$" value={gross} onChange={(e) => setGross(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea rows={2} placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="expense" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(EXPENSE_META) as ExpenseCategory[]).map((k) => (
                        <SelectItem key={k} value={k}>{EXPENSE_META[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(category === "manutencao" || category === "manutencao_preventiva") && (
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
                  <Input type="number" inputMode="decimal" placeholder="R$" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea rows={2} placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button className="flex-1 gradient-success text-primary-foreground" onClick={submit}>Salvar</Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
