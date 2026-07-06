import { useEffect, useRef, useState } from "react";
import { Loader2, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShareResultCard, type ShareCardFormat, type ShareCardMode, type ShareApp } from "./ShareResultCard";
import { generateCardImage, shareOrSaveImage } from "@/lib/shareImage";

export interface ShareCardData {
  periodLabel: string;
  dateLabel: string;
  liquido: {
    heroValue: string;
    metaBatida: boolean;
    metaExcedente?: string;
    metaLabel: string;
    metaPct: number;
  };
  bruto: {
    heroValue: string;
    metaBatida: boolean;
    metaExcedente?: string;
    metaLabel: string;
    metaPct: number;
  };
  perHour: string;
  perKm: string;
  jornada: string;
  apps: ShareApp[];
  gastosLabel?: string;
  gastosValue?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode?: ShareCardMode;
  cardData: ShareCardData;
}

export function ShareResultSheet({ open, onClose, cardData }: Props) {
  // Padrão de compartilhamento: sempre story + líquido, independente da Home.
  const [format, setFormat] = useState<ShareCardFormat>("story");
  const [mode, setMode] = useState<ShareCardMode>("liquido");
  const [loading, setLoading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Reseta pro padrão quando abre.
  useEffect(() => {
    if (open) {
      setFormat("story");
      setMode("liquido");
    }
  }, [open]);

  const modeData = mode === "liquido" ? cardData.liquido : cardData.bruto;

  const commonProps = {
    format,
    mode,
    periodLabel: cardData.periodLabel || "—",
    dateLabel: cardData.dateLabel || "—",
    heroValue: modeData.heroValue || "R$ 0,00",
    metaBatida: modeData.metaBatida,
    metaExcedente: modeData.metaExcedente,
    metaLabel: modeData.metaLabel || "Sem meta",
    metaPct: modeData.metaPct || 0,
    perHour: cardData.perHour || "—",
    perKm: cardData.perKm || "—",
    jornada: cardData.jornada || "—",
    apps: cardData.apps || [],
    gastosLabel: cardData.gastosLabel,
    gastosValue: cardData.gastosValue,
  };

  async function handleAction() {
    if (loading) return;
    if (!exportRef.current) {
      toast.error("Não deu pra gerar a imagem, tenta de novo.");
      return;
    }
    setLoading(true);
    try {
      const blob = await generateCardImage(exportRef.current);
      const outcome = await shareOrSaveImage(blob, "volant-resultado.png");
      if (outcome === "saved") toast.success("Imagem salva!");
      else if (outcome === "failed") toast.error("Não deu pra gerar a imagem, tenta de novo.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não deu pra gerar a imagem, tenta de novo.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] rounded-t-2xl p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-base">Compartilhar resultado</SheetTitle>
        </SheetHeader>

        {/* Toggles */}
        <div className="px-5 flex flex-col gap-2">
          <ToggleRow
            options={[
              { value: "story", label: "Story" },
              { value: "square", label: "Quadrado" },
            ]}
            value={format}
            onChange={(v) => setFormat(v as ShareCardFormat)}
          />
          <ToggleRow
            options={[
              { value: "liquido", label: "Líquido" },
              { value: "bruto", label: "Bruto" },
            ]}
            value={mode}
            onChange={(v) => setMode(v as ShareCardMode)}
          />
        </div>

        {/* Prévia */}
        <div className="flex-1 overflow-auto px-5 py-4 flex items-start justify-center">
          <div
            className={cn(
              "rounded-xl overflow-hidden shadow-lg border border-border",
              format === "story" ? "w-[220px]" : "w-[280px]",
            )}
          >
            <ShareResultCard {...commonProps} exportSize={false} />
          </div>
        </div>

        {/* Ações */}
        <div className="border-t border-border p-4 flex gap-3 bg-background">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? "Gerando..." : "Salvar"}
          </Button>
          <Button
            className="flex-1"
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {loading ? "Gerando..." : "Compartilhar"}
          </Button>
        </div>

        {/* Card de exportação em tamanho real (fora da tela) */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            pointerEvents: "none",
            opacity: 1,
          }}
        >
          <ShareResultCard {...commonProps} exportSize ref={exportRef} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-muted/40 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            value === opt.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
