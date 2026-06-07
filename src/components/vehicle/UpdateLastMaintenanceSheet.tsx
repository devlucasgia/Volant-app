import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/NumberField";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useData } from "@/context/DataContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: "oleo" | "pneus";
  /** KM atual sugerido por padrão. */
  defaultKm?: number;
  /** Data sugerida por padrão (default = hoje). */
  defaultDate?: Date;
}

const LABEL: Record<"oleo" | "pneus", string> = {
  oleo: "Troca de óleo",
  pneus: "Troca de pneus",
};

export function UpdateLastMaintenanceSheet({
  open,
  onOpenChange,
  type,
  defaultKm,
  defaultDate,
}: Props) {
  const { addEntry } = useData();
  const [km, setKm] = useState<number | null>(defaultKm ?? null);
  const [date, setDate] = useState<Date>(defaultDate ?? new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setKm(defaultKm ?? null);
      setDate(defaultDate ?? new Date());
    }
  }, [open, defaultKm, defaultDate]);

  const save = async () => {
    if (!km || km <= 0) {
      toast.error("Informe o KM da manutenção");
      return;
    }
    setSaving(true);
    try {
      await addEntry({
        id: crypto.randomUUID(),
        type: "expense",
        date: date.toISOString(),
        expense: {
          category: "manutencao",
          amount: 0,
          description: `Registro de ${LABEL[type].toLowerCase()} (apenas acompanhamento)`,
          maintenanceType: type,
        },
      });
      toast.success(`${LABEL[type]} registrada`);
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-400/25">
              <Wrench className="h-4 w-4" />
            </span>
            Atualizar última {LABEL[type].toLowerCase()}
          </SheetTitle>
          <SheetDescription>
            Informe o KM em que a manutenção foi feita. Isso atualiza o acompanhamento e zera o aviso.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">KM em que foi feita</Label>
            <NumberField value={km} onChange={setKm} decimal={false} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm",
                  )}
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
