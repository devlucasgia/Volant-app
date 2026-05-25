import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, MessageSquare, LayoutGrid, ChevronRight, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils";

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
          <Paintbrush className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Personalização
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Ajuste a aparência e organize sua experiência no Volant.
          </p>
        </div>
      </div>
    </header>
  );
}

interface HubCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  delayMs?: number;
}

function HubCard({ to, icon, title, description, delayMs = 0 }: HubCardProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        "group flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left",
        "shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)]",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "animate-fade-in active:scale-[0.985] hover:bg-card/95 hover:border-primary/35",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight text-foreground">{title}</div>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export default function Personalizacao() {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen">
      <ScreenHeader onBack={() => navigate("/ajustes")} />
      <div className="space-y-2.5 px-4 py-6">
        <HubCard
          to="/ajustes/personalizacao/aparencia"
          icon={<Palette className="h-5 w-5" />}
          title="Aparência"
          description="Ajuste tema, modo de exibição e tamanho do texto."
          delayMs={0}
        />
        <HubCard
          to="/ajustes/personalizacao/saudacao"
          icon={<MessageSquare className="h-5 w-5" />}
          title="Saudação"
          description="Personalize como o Volant conversa com você."
          delayMs={60}
        />
        <HubCard
          to="/ajustes/personalizacao/cards"
          icon={<LayoutGrid className="h-5 w-5" />}
          title="Organização dos cards"
          description="Escolha o que aparece e ajuste a ordem dos cards."
          delayMs={120}
        />
      </div>
    </div>
  );
}
