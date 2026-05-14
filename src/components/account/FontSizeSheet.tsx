import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useFontScale, FONT_SCALE_OPTIONS, fontScalePx, type FontScale } from "@/lib/fontScale";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function FontSizeSheet({ open, onOpenChange }: Props) {
  const [scale, setScale] = useFontScale();
  const idx = FONT_SCALE_OPTIONS.findIndex((o) => o.value === scale);

  const onSlide = (v: number[]) => {
    const i = Math.max(0, Math.min(FONT_SCALE_OPTIONS.length - 1, v[0]));
    setScale(FONT_SCALE_OPTIONS[i].value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Tamanho dos textos</SheetTitle>
          <SheetDescription>
            Ajuste o tamanho do texto em todo o app. A mudança é aplicada imediatamente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-5">
          <div className="space-y-2" style={{ fontSize: `${fontScalePx(scale)}px` }}>
            <div className="text-[1.25em] font-semibold leading-tight">R$ 1.248,90</div>
            <div className="text-[0.875em] text-muted-foreground">
              Pré-visualização do texto e dos números no app.
            </div>
          </div>
        </div>

        <div className="mt-6 px-1">
          <Slider
            value={[idx < 0 ? 1 : idx]}
            min={0}
            max={FONT_SCALE_OPTIONS.length - 1}
            step={1}
            onValueChange={onSlide}
          />
          <div className="mt-3 flex justify-between text-[11px] font-medium text-muted-foreground">
            {FONT_SCALE_OPTIONS.map((o) => (
              <span
                key={o.value}
                className={cn(
                  "transition-colors",
                  o.value === scale && "text-foreground font-semibold",
                )}
              >
                {o.label}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Sua preferência é salva neste dispositivo.
        </p>
      </SheetContent>
    </Sheet>
  );
}

export type { FontScale };
