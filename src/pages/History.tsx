import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { Segmented } from "@/components/Segmented";
import { useData } from "@/context/DataContext";
import { useUI } from "@/context/UIContext";
import { useAccess } from "@/context/AccessContext";
import { PremiumLockOverlay } from "@/components/PremiumLockOverlay";
import { Entry, EarningEntry } from "@/types";
import { brl } from "@/lib/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreVertical, Pencil, Route, Search, ShieldCheck, Trash2, X } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { friendlyDbError } from "@/lib/friendlyErrors";

type Filter = "all" | "earning" | "expense";

/** Um item do histórico: entrada solta OU sessão multi-plataforma agrupada. */
type HistoryItem =
  | { kind: "single"; entry: Entry; id: string; date: string }
  | { kind: "session"; rows: EarningEntry[]; groupId: string; id: string; date: string };

const FILTERS = [
  { key: "all" as const, label: "Todos" },
  { key: "earning" as const, label: "Ganhos" },
  { key: "expense" as const, label: "Gastos" },
];

const SWIPE_REVEAL = 92; // px

function fmtHM(dec: number) {
  let h = Math.floor(dec);
  let m = Math.round((dec - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

interface SwipeRowProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

function SwipeRow({ children, onEdit, onDelete }: SwipeRowProps) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const x = e.touches[0].clientX - startX.current;
    const y = e.touches[0].clientY - (startY.current as number);
    if (!dragging.current) {
      if (Math.abs(x) > 8 && Math.abs(x) > Math.abs(y)) dragging.current = true;
      else return;
    }
    const clamped = Math.max(-140, Math.min(140, x));
    setDx(clamped);
  };
  const onTouchEnd = () => {
    if (Math.abs(dx) >= SWIPE_REVEAL * 0.95) {
      if (dx < 0) {
        // swipe left -> delete
        onDelete();
      } else {
        // swipe right -> edit
        onEdit();
      }
    }
    setDx(0);
    startX.current = null;
    startY.current = null;
    dragging.current = false;
  };

  const revealLeft = dx > 0;   // edit revealed (right side action)
  const revealRight = dx < 0;  // delete revealed
  const intensity = Math.min(1, Math.abs(dx) / SWIPE_REVEAL);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Edit underlay (revealed when swiping right) */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 transition-opacity"
        style={{ opacity: revealLeft ? intensity : 0, backgroundColor: "hsl(var(--info) / 0.18)" }}
      >
        <span className="flex items-center gap-2 rounded-full bg-info px-3 py-1.5 text-xs font-bold text-info-foreground">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </span>
      </div>
      {/* Delete underlay (revealed when swiping left) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-opacity"
        style={{ opacity: revealRight ? intensity : 0, backgroundColor: "hsl(var(--destructive) / 0.18)" }}
      >
        <span className="flex items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </span>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? "transform 200ms ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function History() {
  const { entries, removeEntry, removeGroup, platformMetaFor, expenseMetaFor } = useData();
  const { openDrawer } = useUI();
  const { isLimited, requirePremium } = useAccess();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: "single"; entry: Entry }
    | { kind: "session"; groupId: string; count: number }
    | null
  >(null);

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

  // Agrupa por dia E por group_id (sessões multi-plataforma viram um único item).
  const grouped = useMemo(() => {
    const acc: Record<string, HistoryItem[]> = {};
    // Primeira passada: junta linhas por groupId mantendo a ordem temporal.
    const sessionsByGroup = new Map<string, EarningEntry[]>();
    const ordered: Entry[] = [];
    for (const e of filtered) {
      if (e.type === "earning" && e.groupId) {
        const list = sessionsByGroup.get(e.groupId);
        if (list) { list.push(e); continue; }
        const arr: EarningEntry[] = [e];
        sessionsByGroup.set(e.groupId, arr);
        ordered.push(e); // marca a posição do primeiro encontro
        continue;
      }
      ordered.push(e);
    }
    for (const e of ordered) {
      const day = format(new Date(e.date), "yyyy-MM-dd");
      const list = (acc[day] ||= []);
      if (e.type === "earning" && e.groupId) {
        const rows = sessionsByGroup.get(e.groupId)!;
        // Só vira "session" quando tem 2+ linhas; se sobrou 1 (filtros), trata como single
        if (rows.length > 1) {
          list.push({ kind: "session", rows, groupId: e.groupId, id: `g:${e.groupId}`, date: rows[0].date });
        } else {
          list.push({ kind: "single", entry: rows[0], id: rows[0].id, date: rows[0].date });
        }
      } else {
        list.push({ kind: "single", entry: e, id: e.id, date: e.date });
      }
    }
    return acc;
  }, [filtered]);

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const handleEditSingle = (e: Entry) => {
    if (!requirePremium()) return;
    openDrawer({ editing: e });
  };
  const handleEditSession = (rows: EarningEntry[]) => {
    if (!requirePremium()) return;
    openDrawer({ editingGroup: rows });
  };
  const handleDeleteSingle = (e: Entry) => {
    if (!requirePremium()) return;
    setConfirmDelete({ kind: "single", entry: e });
  };
  const handleDeleteSession = (groupId: string, count: number) => {
    if (!requirePremium()) return;
    setConfirmDelete({ kind: "session", groupId, count });
  };


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

      <div className="relative">
      <div className="space-y-4 px-4 pt-4">
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

        <Segmented<Filter> options={FILTERS} value={filter} onChange={setFilter} tone="flat" size="sm" />

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? "Nenhum registro ainda. Toque no botão verde para começar."
              : "Nenhum resultado para os filtros aplicados."}
          </div>
        )}

        {days.map((day) => {
          const items = grouped[day];
          return (
            <section key={day}>
              <div className="mb-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {format(new Date(day + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
              </div>

              <div className="space-y-2">
                {items.map((item) => {
                  // ─── Card de sessão multi-plataforma ───
                  if (item.kind === "session") {
                    const rows = item.rows;
                    const anchor = rows[0];
                    const total = rows.reduce((s, r) => s + (r.gross || 0), 0);
                    const km = anchor.km;
                    const hrs = anchor.hours;

                    const card = (
                      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                        {/* Header */}
                        <div className="flex items-center gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <Route className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Jornada · {rows.length} apps</span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(anchor.date), "HH:mm")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tabular-nums text-success">+ {brl(total)}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Ações">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditSession(rows)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar jornada
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteSession(item.groupId, rows.length)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir jornada
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* App lines */}
                        <div className="my-2 border-t border-border/50" />
                        <div className="space-y-1.5">
                          {rows.map((r) => {
                            const meta = platformMetaFor(r.app);
                            return (
                              <div key={r.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <PlatformLogo
                                    platformKey={r.app}
                                    label={meta.label}
                                    hex={meta.hex}
                                    imageUrl={meta.imageUrl}
                                    size="sm"
                                  />
                                  <span className="truncate text-xs font-medium">{meta.label}</span>
                                  {(r.rides ?? 0) > 0 && (
                                    <span className="text-[11px] text-muted-foreground">{r.rides} corr.</span>
                                  )}
                                </div>
                                <span className="text-sm font-semibold tabular-nums text-success">{brl(r.gross)}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer */}
                        {(km > 0 || hrs > 0 || anchor.notes) && (
                          <>
                            <div className="my-2 border-t border-border/50" />
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1">
                                {km > 0 && <span>{km} km</span>}
                                {km > 0 && hrs > 0 && <span>·</span>}
                                {hrs > 0 && <span>{fmtHM(hrs)}</span>}
                              </div>
                              {anchor.notes && (
                                <span className="truncate">{anchor.notes}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );

                    return (
                      <SwipeRow
                        key={item.id}
                        onEdit={() => handleEditSession(rows)}
                        onDelete={() => handleDeleteSession(item.groupId, rows.length)}
                      >
                        {card}
                      </SwipeRow>
                    );
                  }

                  // ─── Card simples (entrada solta) ───
                  const e = item.entry;
                  const isEarn = e.type === "earning";
                  const card = (
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                      {isEarn ? (
                        <PlatformLogo
                          platformKey={e.app}
                          label={platformMetaFor(e.app).label}
                          hex={platformMetaFor(e.app).hex}
                          imageUrl={platformMetaFor(e.app).imageUrl}
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
                          {isEarn && (e.km > 0 || e.hours > 0 || (e.rides ?? 0) > 0) && (
                            <span className="text-[11px] text-muted-foreground">
                              {(e.rides ?? 0) > 0 ? `${e.rides} corr.` : ""}
                              {(e.rides ?? 0) > 0 && (e.km > 0 || e.hours > 0) ? " · " : ""}
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
                          <DropdownMenuItem onClick={() => handleEditSingle(e)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteSingle(e)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                  return (
                    <SwipeRow
                      key={item.id}
                      onEdit={() => handleEditSingle(e)}
                      onDelete={() => handleDeleteSingle(e)}
                    >
                      {card}
                    </SwipeRow>
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
      {isLimited && (
        <PremiumLockOverlay
          title="Histórico completo no Premium"
          description="Visualize, edite e exclua seus registros assinando o Volant Premium."
        />
      )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.kind === "session"
                ? "Excluir esta jornada?"
                : "Deseja excluir este registro?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.kind === "session"
                ? `Essa ação não pode ser desfeita. Os ${confirmDelete.count} registros desta jornada serão removidos.`
                : "Essa ação não pode ser desfeita. O registro será removido do seu histórico."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const target = confirmDelete;
                setConfirmDelete(null);
                if (!target) return;
                try {
                  if (target.kind === "session") {
                    await removeGroup(target.groupId);
                  } else {
                    await removeEntry(target.entry.id);
                  }
                } catch (err) {
                  toast.error("Não foi possível excluir", {
                    description: friendlyDbError(err, "Tente novamente em instantes."),
                  });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
