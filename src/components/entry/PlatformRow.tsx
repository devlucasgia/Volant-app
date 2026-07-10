import { useState } from "react";
import { X } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { PlatformLogo } from "@/components/PlatformLogo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/context/DataContext";
import { Plus } from "lucide-react";

export interface PlatformRowData {
  /** id local da linha (apenas para chave de UI) */
  uid: string;
  app: string;
  gross: number | null;
  rides: number | null;
}

interface Props {
  row: PlatformRowData;
  onChange: (next: PlatformRowData) => void;
  onRemove?: () => void;
  /** chaves já usadas na sessão (para não permitir duplicar) */
  usedKeys?: string[];
  /** abre o diálogo "+ Criar nova plataforma" */
  onCreateNewPlatform: () => void;
  /** quando true, a linha some o botão remover (única linha) */
  hideRemove?: boolean;
}

export function PlatformRow({ row, onChange, onRemove, usedKeys = [], onCreateNewPlatform, hideRemove }: Props) {
  const { earningPlatforms } = useData();
  const [selectOpen, setSelectOpen] = useState(false);
  const meta = earningPlatforms.find((p) => p.key === row.app);

  // Só plataformas operacionais (ride) disponíveis. A simples não entra em sessão.
  const available = earningPlatforms.filter(
    (p) => p.type === "ride" && (p.key === row.app || !usedKeys.includes(p.key)),
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <Select
          open={selectOpen}
          onOpenChange={setSelectOpen}
          value={row.app}
          onValueChange={(v) => {
            if (v === "__new__") {
              setSelectOpen(false);
              onCreateNewPlatform();
              return;
            }
            onChange({ ...row, app: v });
          }}
        >
          <SelectTrigger className="h-auto w-auto shrink-0 border-0 bg-transparent p-0 shadow-none focus:ring-0">
            <SelectValue asChild>
              <button type="button" className="flex items-center gap-2">
                {meta ? (
                  <PlatformLogo
                    platformKey={meta.key}
                    label={meta.label}
                    hex={meta.hex}
                    imageUrl={meta.imageUrl}
                    size="sm"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-muted" />
                )}
                <span className="text-sm font-bold">{meta?.label || row.app}</span>
              </button>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {available.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                <div className="flex items-center gap-2.5">
                  <PlatformLogo platformKey={p.key} label={p.label} hex={p.hex} imageUrl={p.imageUrl} size="sm" />
                  <span>{p.label}</span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value="__new__">
              <div className="flex items-center gap-2 text-primary">
                <Plus className="h-4 w-4" /> Criar nova plataforma
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {!hideRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover plataforma"
            className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[1fr,90px] gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Valor recebido</label>
          <NumberField
            currency
            value={row.gross}
            onChange={(v) => onChange({ ...row, gross: v })}
            className="h-11 text-base font-bold"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Corridas</label>
          <NumberField
            placeholder=""
            value={row.rides}
            onChange={(v) => onChange({ ...row, rides: v })}
            decimal={false}
            className="h-11 text-center"
            onFocus={(e) => {
              const el = e.currentTarget;
              window.setTimeout(() => {
                try {
                  el.scrollIntoView({ block: "center", behavior: "smooth" });
                } catch {
                  el.scrollIntoView();
                }
              }, 120);
            }}
          />
        </div>
      </div>
    </div>
  );
}
