import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PlatformLogo } from "@/components/PlatformLogo";

const EMOJI_OPTIONS = ["⛽","🍔","🔧","📦","💰","🚗","🚕","🛞","🪛","💡","☕","🍕","🛒","🏥","🎁","📱","🧾","🚿","🅿️","🛣️","💸"];
const COLOR_OPTIONS = ["#F59E0B","#EF4444","#10B981","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#6366F1","#F97316","#6B7280","#000000","#FFCC00","#A4E333"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: "earning" | "expense";
  editing?: { id: string; key: string; label: string; emoji: string; color: string } | null;
  onCreated?: (key: string) => void;
}

const BUILTIN_PLATFORM_KEYS = new Set(["uber", "99", "indriver", "particular"]);

export function CategoryDialog({ open, onOpenChange, type, editing, onCreated }: Props) {
  const { addCategory, updateCategory } = useData();
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const isEarning = type === "earning";
  const isBuiltinPlatform = isEarning && !!editing && BUILTIN_PLATFORM_KEYS.has(editing.key);

  useEffect(() => {
    if (open) {
      setLabel(editing?.label || "");
      setEmoji(editing?.emoji || (isEarning ? "🚗" : EMOJI_OPTIONS[0]));
      setColor(editing?.color || COLOR_OPTIONS[0]);
    }
  }, [open, editing, isEarning]);

  const submit = async () => {
    if (!label.trim()) return toast.error("Informe um nome");
    setSaving(true);
    try {
      // Earning platforms never store a meaningful emoji (logos handled by PlatformLogo)
      const finalEmoji = isEarning ? "🚗" : emoji;
      if (editing) {
        await updateCategory(editing.id, { label: label.trim(), emoji: finalEmoji, color });
        toast.success(isEarning ? "Plataforma atualizada" : "Categoria atualizada");
      } else {
        const key = `cat_${Date.now()}`;
        await addCategory({ type, key, label: label.trim(), emoji: finalEmoji, color });
        onCreated?.(key);
        toast.success(isEarning ? "Plataforma criada" : "Categoria criada");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? (isEarning ? "Editar plataforma" : "Editar categoria")
              : (isEarning ? "Nova plataforma" : "Nova categoria")}
          </DialogTitle>
          <DialogDescription>
            {isEarning
              ? "Personalize o nome e a cor da plataforma."
              : "Personalize com nome, ícone e cor."}
          </DialogDescription>
        </DialogHeader>

        {/* Live preview for earning platforms */}
        {isEarning && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <PlatformLogo
              platformKey={editing?.key || "custom"}
              label={label || "?"}
              hex={color}
              size="md"
            />
            <div className="text-sm font-semibold">{label || "Sem nome"}</div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isEarning ? "Ex: Cabify" : "Ex: Pedágio"}
              disabled={isBuiltinPlatform}
            />
            {isBuiltinPlatform && (
              <p className="text-[11px] text-muted-foreground">
                O nome de plataformas oficiais não pode ser alterado.
              </p>
            )}
          </div>

          {/* Emoji picker only for expense categories */}
          {!isEarning && (
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-10 gap-1">
                {EMOJI_OPTIONS.map((em) => (
                  <button key={em} type="button" onClick={() => setEmoji(em)}
                    className={cn("flex h-9 items-center justify-center rounded-md border text-lg",
                      emoji === em ? "border-primary bg-primary/10" : "border-border")}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((co) => (
                <button key={co} type="button" onClick={() => setColor(co)}
                  className={cn("h-8 w-8 rounded-full border-2", color === co ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: co }} />
              ))}
            </div>
            {isBuiltinPlatform && (
              <p className="text-[11px] text-muted-foreground">
                A cor é usada apenas para gráficos. O logo oficial da plataforma é mantido.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
