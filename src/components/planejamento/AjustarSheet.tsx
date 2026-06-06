import { Target, CalendarDays, Route, Car as CarIcon, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export type AjustarOpcao = "meta" | "dias" | "kmDia" | "custos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (opcao: AjustarOpcao) => void;
}

const OPCOES: {
  key: AjustarOpcao;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}[] = [
  {
    key: "meta",
    icon: Target,
    title: "Meta",
    desc: "Altere o valor ou o tipo da sua meta principal.",
  },
  {
    key: "dias",
    icon: CalendarDays,
    title: "Dias de trabalho",
    desc: "Atualize os dias em que pretende rodar.",
  },
  {
    key: "kmDia",
    icon: Route,
    title: "KM médio por dia",
    desc: "Atualize a média de KM que você costuma rodar em um dia de trabalho.",
  },
  {
    key: "custos",
    icon: CarIcon,
    title: "Custos",
    desc: "Edite os custos fixos e variáveis considerados no planejamento.",
  },
];

export function AjustarSheet({ open, onOpenChange, onSelect }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-border bg-background/95 px-4 pb-6 pt-5 backdrop-blur-lg"
      >
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="text-[18px] font-bold tracking-tight">
            O que você quer ajustar?
          </SheetTitle>
          <SheetDescription className="text-[12.5px] leading-snug">
            Edite só uma parte do seu planejamento sem refazer tudo.
          </SheetDescription>
        </SheetHeader>

        <ul className="mt-4 space-y-2">
          {OPCOES.map((opt) => {
            const Icon = opt.icon;
            return (
              <li key={opt.key}>
                <button
                  type="button"
                  onClick={() => onSelect(opt.key)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3.5 text-left transition-all active:scale-[0.985] hover:bg-muted/30"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold leading-tight text-foreground">
                      {opt.title}
                    </div>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {opt.desc}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
