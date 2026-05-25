import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Moon, Sun, Type, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/context/DataContext";
import { FontSizeSheet } from "@/components/account/FontSizeSheet";
import { useFontScale, FONT_SCALE_OPTIONS } from "@/lib/fontScale";
import { toast } from "sonner";

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
          <Palette className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Aparência
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Ajuste tema e tamanho do texto.
          </p>
        </div>
      </div>
    </header>
  );
}

export default function PersonalizacaoAparencia() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useData();
  const [fontOpen, setFontOpen] = useState(false);
  const [fontScale] = useFontScale();
  const fontScaleLabel = FONT_SCALE_OPTIONS.find((o) => o.value === fontScale)?.label ?? "Padrão";

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const autoSave = async (patch: Parameters<typeof updateSettings>[0]) => {
    try {
      await updateSettings(patch);
      toast.success("Alterações salvas", { id: "autosave", duration: 1600 });
    } catch {
      toast.error("Não foi possível salvar agora.", { id: "autosave" });
    }
  };

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={() => navigate("/ajustes/personalizacao")} />
      <div className="space-y-3 px-4 py-6">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-foreground/80">
              {settings.theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Modo escuro</div>
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

        <button
          type="button"
          onClick={() => setFontOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-card/95 active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-foreground/80">
              <Type className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Tamanho dos textos</div>
              <div className="text-[11px] text-muted-foreground">{fontScaleLabel}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <FontSizeSheet open={fontOpen} onOpenChange={setFontOpen} />
    </div>
  );
}
