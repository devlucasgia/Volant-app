import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Tags, Wallet, Receipt, ChevronRight } from "lucide-react";

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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
          <Tags className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Categorias
          </h1>
          <p className="text-[11px] leading-tight text-muted-foreground/80">
            Organize suas fontes de ganho e categorias de gasto.
          </p>
        </div>
      </div>
    </header>
  );
}

function HubCard({
  to, icon, title, subtitle, onClick,
}: { to: string; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-[0_1px_0_0_hsl(var(--border)),0_8px_21px_-18px_rgba(0,0,0,0.40)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-card/95 hover:border-primary/35 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight">{title}</div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground group-active:translate-x-1" />
    </button>
  );
}

export default function Categorias() {
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ScreenHeader onBack={() => navigate("/ajustes")} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-2.5 px-4 py-6 pb-28">
        <HubCard
          to="/ajustes/categorias/ganhos"
          icon={<Wallet className="h-4 w-4" />}
          title="Ganhos"
          subtitle="Gerencie os apps e fontes de ganho."
          onClick={() => navigate("/ajustes/categorias/ganhos")}
        />
        <HubCard
          to="/ajustes/categorias/gastos"
          icon={<Receipt className="h-4 w-4" />}
          title="Gastos"
          subtitle="Gerencie suas categorias de despesas."
          onClick={() => navigate("/ajustes/categorias/gastos")}
        />
        <p className="pt-2 text-center text-[10.5px] text-muted-foreground/60">
          Toque em um item para abrir.
        </p>
      </div>
    </div>
  );
}
