import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PlatformLogo } from "@/components/PlatformLogo";
import { Car, Wallet, Upload, X, Loader2 } from "lucide-react";
import type { PlatformType } from "@/types";

const EMOJI_OPTIONS = ["⛽","🍔","🔧","📦","💰","🚗","🚕","🛞","🪛","💡","☕","🍕","🛒","🏥","🎁","📱","🧾","🚿","🅿️","🛣️","💸"];
const COLOR_OPTIONS = ["#F59E0B","#EF4444","#10B981","#3B82F6","#8B5CF6","#EC4899","#14B8A6","#6366F1","#F97316","#6B7280","#000000","#FFCC00","#A4E333"];

interface EditingPayload {
  id: string;
  key: string;
  label: string;
  emoji: string;
  color: string;
  platformType?: PlatformType;
  imageUrl?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: "earning" | "expense";
  editing?: EditingPayload | null;
  onCreated?: (key: string) => void;
}

const BUILTIN_PLATFORM_KEYS = new Set(["uber", "99", "indriver", "particular"]);

export function CategoryDialog({ open, onOpenChange, type, editing, onCreated }: Props) {
  const { addCategory, updateCategory } = useData();
  const { user } = useAuth();
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [platformType, setPlatformType] = useState<PlatformType>("ride");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEarning = type === "earning";
  const isBuiltinPlatform = isEarning && !!editing && BUILTIN_PLATFORM_KEYS.has(editing.key);

  useEffect(() => {
    if (open) {
      setLabel(editing?.label || "");
      setEmoji(editing?.emoji || (isEarning ? "🚗" : EMOJI_OPTIONS[0]));
      setColor(editing?.color || COLOR_OPTIONS[0]);
      setPlatformType(editing?.platformType || "ride");
      setImageUrl(editing?.imageUrl ?? null);
    }
  }, [open, editing, isEarning]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter até 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("category-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("category-logos").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error("Falha no upload: " + (e?.message || ""));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!label.trim()) return toast.error("Informe um nome");
    setSaving(true);
    try {
      const finalEmoji = isEarning ? "🚗" : emoji;
      if (editing) {
        await updateCategory(editing.id, {
          label: label.trim(),
          emoji: finalEmoji,
          color,
          ...(isEarning ? { platformType, imageUrl } : {}),
        });
        toast.success(isEarning ? "Plataforma atualizada" : "Categoria atualizada");
      } else {
        const key = `cat_${Date.now()}`;
        await addCategory({
          type, key, label: label.trim(), emoji: finalEmoji, color,
          ...(isEarning ? { platformType, imageUrl } : {}),
        });
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
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? (isEarning ? "Editar plataforma" : "Editar categoria")
              : (isEarning ? "Nova plataforma" : "Nova categoria")}
          </DialogTitle>
          <DialogDescription>
            {isEarning
              ? "Personalize o nome, tipo e logo da plataforma."
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
              imageUrl={imageUrl}
              size="md"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{label || "Sem nome"}</div>
              <div className="text-[11px] text-muted-foreground">
                {platformType === "ride" ? "Plataforma operacional" : "Receita simples"}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Platform type — only for earning, only for non-builtins */}
          {isEarning && !isBuiltinPlatform && (
            <div className="space-y-2">
              <Label>Tipo de plataforma</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlatformType("ride")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all",
                    platformType === "ride" ? "border-primary bg-primary/5" : "border-border opacity-80"
                  )}
                >
                  <Car className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold">Operacional</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    Corridas com km, horas e R$/h
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformType("simple")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all",
                    platformType === "simple" ? "border-primary bg-primary/5" : "border-border opacity-80"
                  )}
                >
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold">Receita simples</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    Apenas valor (vendas, gorjetas...)
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isEarning ? "Ex: Lucas Store" : "Ex: Pedágio"}
              disabled={isBuiltinPlatform}
            />
            {isBuiltinPlatform && (
              <p className="text-[11px] text-muted-foreground">
                O nome de plataformas oficiais não pode ser alterado.
              </p>
            )}
          </div>

          {/* Logo upload — earning custom platforms only */}
          {isEarning && !isBuiltinPlatform && (
            <div className="space-y-2">
              <Label>Logo (opcional)</Label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="" className="h-14 w-14 rounded-full object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-border text-muted-foreground">
                    <Upload className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : imageUrl ? "Trocar imagem" : "Enviar imagem"}
                  </Button>
                  <p className="mt-1 text-[10px] text-muted-foreground">PNG ou JPG até 2MB.</p>
                </div>
              </div>
            </div>
          )}

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
          <Button onClick={submit} disabled={saving || uploading}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
