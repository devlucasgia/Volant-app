import { useEffect, useRef, useState } from "react";
import { Loader2, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShareResultCard, type ShareCardFormat, type ShareCardMode, type ShareApp } from "./ShareResultCard";
import { generateCardImage, saveImageToDevice, shareImageViaSystem } from "@/lib/shareImage";

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

// Larguras de design (mesmas do ShareResultCard) — para escala da prévia.
const DESIGN_STORY_W = 280;
const DESIGN_SQUARE_W = 300;
// Largura-alvo da prévia dentro do sheet.
const PREVIEW_STORY_W = 240;
const PREVIEW_SQUARE_W = 300;

export function ShareResultSheet({ open, onClose, initialMode = "liquido", cardData }: Props) {
  const [format, setFormat] = useState<ShareCardFormat>("story");
  const [mode, setMode] = useState<ShareCardMode>(initialMode);
  const [savingLoading, setSavingLoading] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setFormat("story");
      setMode(initialMode);
    }
  }, [open, initialMode]);

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

  const previewDesignW = format === "story" ? DESIGN_STORY_W : DESIGN_SQUARE_W;
  const previewTargetW = format === "story" ? PREVIEW_STORY_W : PREVIEW_SQUARE_W;
  const previewScale = previewTargetW / previewDesignW;

  const anyLoading = savingLoading || sharingLoading;

  async function handleSave() {
    if (anyLoading) return;
    if (!exportRef.current) {
      toast.error("Não deu pra gerar a imagem, tenta de novo.");
      return;
    }
    setSavingLoading(true);
    try {
      const blob = await generateCardImage(exportRef.current);
      const outcome = await saveImageToDevice(blob, "volant-resultado.png");
      if (outcome === "saved") toast.success("Imagem salva!");
      else toast.error("Não deu pra salvar a imagem.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não deu pra gerar a imagem, tenta de novo.";
      toast.error(msg);
    } finally {
      setSavingLoading(false);
    }
  }

  async function handleShare() {
    if (anyLoading) return;
    if (!exportRef.current) {
      toast.error("Não deu pra gerar a imagem, tenta de novo.");
      return;
    }
    setSharingLoading(true);
    try {
      const blob = await generateCardImage(exportRef.current);
      const outcome = await shareImageViaSystem(blob, "volant-resultado.png");
      if (outcome === "shared") {
        // sucesso silencioso — o sistema já mostrou UI
      } else if (outcome === "unsupported") {
        toast.info("Compartilhamento não disponível neste dispositivo. Use Salvar.");
      } else {
        toast.error("Não deu pra compartilhar, tenta de novo.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não deu pra gerar a imagem, tenta de novo.";
      toast.error(msg);
    } finally {
      setSharingLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] rounded-t-2xl p-0 flex flex-col overflow-hidden"
      >
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
          <SheetHeader className="px-5 pt-5 pb-3">
            <SheetTitle className="text-base text-left">Compartilhar resultado</SheetTitle>
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
              className="rounded-2xl overflow-hidden shadow-lg border border-border bg-black"
              style={{
                width: `${previewTargetW}px`,
                height: `${previewTargetW * (format === "story" ? 498 / DESIGN_STORY_W : 1)}px`,
              }}
            >
              <div
                style={{
                  width: `${previewDesignW}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                <ShareResultCard {...commonProps} exportSize={false} />
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="border-t border-border p-4 flex gap-3 bg-background">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleSave}
              disabled={anyLoading}
            >
              {savingLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              {savingLoading ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleShare}
              disabled={anyLoading}
            >
              {sharingLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Share2 className="h-4 w-4" />}
              {sharingLoading ? "Abrindo..." : "Compartilhar"}
            </Button>
          </div>
        </div>

        {/* Nó de exportação em tamanho real (1080px), fora da tela */}
        <div
          aria-hidden
          style={{
            position: "fixed", left: "-10000px", top: 0,
            pointerEvents: "none", opacity: 1,
          }}
        >
          <ShareResultCard {...commonProps} exportSize ref={exportRef} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  options, value, onChange,
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
