import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { useData } from "@/context/DataContext";
import { Entry } from "@/types";
import { brl } from "@/lib/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreVertical, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PlatformLogo } from "@/components/PlatformLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Filter = "all" | "earning" | "expense";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "earning", label: "Ganhos" },
  { key: "expense", label: "Gastos" },
];

export default function History() {
  const { entries, removeEntry, platformMetaFor, expenseMetaFor } = useData();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.type !== filter) return false;
      if (!q) return true;
      if (e.type === "earning") {
        const m = platformMetaFor(e.app);
        return (
          m.label.toLowerCase().includes(q) ||
          (e.notes || "").toLowerCase().includes(q) ||
          String(e.gross).includes(q)
        );
      }
      const m = expenseMetaFor(e.expense.category);
      return (
        m.label.toLowerCase().includes(q) ||
        (e.expense.description || "").toLowerCase().includes(q) ||
        String(e.expense.amount).includes(q)
      );
    });
  }, [entries, filter, search, platformMetaFor, expenseMetaFor]);

  const grouped = useMemo(() => {
    const acc: Record<string, Entry[]> = {};
    for (const e of filtered) {
      const day = format(new Date(e.date), "yyyy-MM-dd");
      (acc[day] ||= []).push(e);
    }
    return acc;
  }, [filtered]);

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <PageHeader
        title="Histórico"
        subtitle={`${entries.length} registro${entries.length === 1 ? "" : "s"}`}
        right={
          <Button
            size="icon"
            variant="outline"
            className="relative h-9 w-9 rounded-xl"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Pesquisar"
          >
            <Search className="h-4 w-4" />
            {search && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-success" />
            )}
          </Button>
        }
      />

      <div className="space-y-4 px-4 pt-4">
        {/* Search input */}
        {searchOpen && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por app, categoria, observação ou valor..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex rounded-xl bg-muted p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                filter === f.key
                  ? "bg-success text-success-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? "Nenhum registro ainda. Toque no botão verde para começar."
              : "Nenhum resultado para os filtros aplicados."}
          </div>
        )}

        {days.map((day) => {
          const items = grouped[day];
          const dayBalance = items.reduce(
            (sum, e) => sum + (e.type === "earning" ? e.gross : -e.expense.amount),
            0
          );
          const positive = dayBalance >= 0;
          return (
            <section key={day}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {format(new Date(day), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
                <div className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium">
                  <span className="text-muted-foreground">Saldo do dia: </span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      positive ? "text-success" : "text-destructive"
                    )}
                  >
                    {positive ? "+ " : "− "}
                    {brl(Math.abs(dayBalance))}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {items.map((e) => {
                  const isEarn = e.type === "earning";
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                    >
                      {isEarn ? (
                        <PlatformLogo
                          platformKey={e.app}
                          label={platformMetaFor(e.app).label}
                          hex={platformMetaFor(e.app).hex}
                          size="md"
                        />
                      ) : (
                        <div
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg"
                          style={{
                            backgroundColor: expenseMetaFor(e.expense.category).hex + "26",
                            color: expenseMetaFor(e.expense.category).hex,
                          }}
                        >
                          <span>{expenseMetaFor(e.expense.category).emoji}</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">
                          {isEarn
                            ? platformMetaFor(e.app).label
                            : expenseMetaFor(e.expense.category).label}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold",
                              isEarn
                                ? "bg-success/15 text-success"
                                : "bg-destructive/15 text-destructive"
                            )}
                          >
                            {isEarn ? "Ganho" : "Gasto"}
                          </span>
                          {isEarn && (e.km > 0 || e.hours > 0) && (
                            <span className="text-[11px] text-muted-foreground">
                              {e.km > 0 ? `${e.km} km` : ""}
                              {e.km > 0 && e.hours > 0 ? " · " : ""}
                              {e.hours > 0 ? `${e.hours}h` : ""}
                            </span>
                          )}
                          {!isEarn && e.expense.description && (
                            <span className="truncate text-[11px] text-muted-foreground">
                              {e.expense.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            isEarn ? "text-success" : "text-destructive"
                          )}
                        >
                          {isEarn ? "+ " : "− "}
                          {brl(isEarn ? e.gross : e.expense.amount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(new Date(e.date), "HH:mm")}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            aria-label="Ações"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm("Excluir este registro?")) removeEntry(e.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {entries.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Seus dados estão protegidos
          </div>
        )}
      </div>
    </>
  );
}
