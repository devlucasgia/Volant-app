import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bug, Loader2, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { verifyImageSignature } from "@/lib/friendlyErrors";
import { collectDeviceInfo } from "@/lib/deviceInfo";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;

export function BugReportDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setContactEmail(user?.email ?? "");
      setFile(null);
      setPreviewUrl(null);
    }
  }, [open, user?.email]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPick = async (f: File | undefined) => {
    if (!f) return;
    const check = await verifyImageSignature(f, MAX_BYTES);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Preencha título e descrição.");
      return;
    }
    if (!user) {
      toast.error("Faça login para enviar feedback.");
      return;
    }
    setSending(true);
    try {
      let screenshotPath: string | undefined;
      if (file) {
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext === "jpeg" ? "jpg" : ext}`;
        const up = await supabase.storage
          .from("feedback-screenshots")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
        screenshotPath = path;
      }

      const { data, error } = await supabase.functions.invoke("send-feedback-email", {
        body: {
          type: "bug",
          title: title.trim(),
          description: description.trim(),
          contactEmail: contactEmail.trim() || undefined,
          screenshotPath,
          deviceInfo: collectDeviceInfo(),
        },
      });
      if ((data as any)?.error === "rate_limited" || (data as any)?.error === "duplicate") {
        toast.error((data as any)?.message || "Aguarde alguns minutos antes de enviar novamente.");
        return;
      }
      if (error) throw error;
      toast.success("Feedback enviado com sucesso.");
      onOpenChange(false);
    } catch (e) {
      console.error("[BugReportDialog]", e);
      toast.error("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" /> Reportar bug
          </DialogTitle>
          <DialogDescription>
            Encontrou algum problema no Volant? Envie os detalhes para analisarmos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título do problema</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Erro ao salvar ganho"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição detalhada</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que aconteceu, onde ocorreu e, se possível, como reproduzir o problema."
              rows={5}
              maxLength={4000}
            />
          </div>

          <div className="space-y-2">
            <Label>E-mail para contato (opcional)</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Anexar print do erro (opcional)</Label>
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img src={previewUrl} alt="Pré-visualização do anexo" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
                  aria-label="Remover anexo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
              >
                <ImagePlus className="h-4 w-4" /> Selecionar imagem
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            <p className="text-[11px] text-muted-foreground">
              PNG, JPG ou WEBP. Tamanho máximo 5MB.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={sending}>
            {sending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>) : "Enviar bug"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
