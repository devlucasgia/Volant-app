import { PageHeader } from "@/components/ui-bits";
import { useData } from "@/context/DataContext";
import { Entry } from "@/types";
import { brl } from "@/lib/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function History() {
  const { entries, removeEntry, platformMetaFor, expenseMetaFor } = useData();

  const grouped = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    const day = format(new Date(e.date), "yyyy-MM-dd");
    (acc[day] ||= []).push(e);
    return acc;
  }, {});

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <PageHeader title="Histórico" subtitle={`${entries.length} registro${entries.length === 1 ? "" : "s"}`} />
      <div className="space-y-5 px-4 pt-4">
        {entries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum registro ainda. Toque no botão verde para começar.
          </div>
        )}

        {days.map((day) => (
          <section key={day}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {format(new Date(day), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
            <div className="space-y-2">
              {grouped[day].map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className={cn(
                    "grid h-10 w-10 place-items-center rounded-full",
                    e.type === "earning" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  )}>
                    {e.type === "earning" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {e.type === "earning" ? (
                      <>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const m = platformMetaFor(e.app);
                            return (
                              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: m.hex }}>
                                <span className="leading-none">{m.emoji}</span>{m.label}
                              </span>
                            );
                          })()}
                          <span className="text-xs text-muted-foreground">
                            {e.km}km · {e.hours}h
                          </span>
                        </div>
                        {e.notes && <div className="truncate text-xs text-muted-foreground">{e.notes}</div>}
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium">{expenseMetaFor(e.expense.category).label}</div>
                        {e.expense.description && <div className="truncate text-xs text-muted-foreground">{e.expense.description}</div>}
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={cn("text-sm font-bold tabular-nums", e.type === "earning" ? "text-success" : "text-destructive")}>
                      {e.type === "earning" ? "+" : "−"} {brl(e.type === "earning" ? e.gross : e.expense.amount)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{format(new Date(e.date), "HH:mm")}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeEntry(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
