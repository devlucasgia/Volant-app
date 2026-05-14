import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bug, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { friendlyDbError } from "@/lib/friendlyErrors";
import { toast } from "sonner";

type FeedbackType = "bug" | "suggestion";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialType?: FeedbackType;
}

const APP_VERSION = "beta";

export function FeedbackDialog({ open, onOpenChange, initialType = "bug" }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setTitle("");
      setDescription("");
      setContactEmail(user?.email ?? "");
    }
  }, [open, initialType, user?.email]);

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
      const { error } = await supabase.from("feedback_reports").insert({
        user_id: user.id,
        type,
        title: title.trim().slice(0, 200),
        description: description.trim().slice(0, 4000),
        contact_email: contactEmail.trim() || null,
        app_version: APP_VERSION,
        device_info: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      } as any);
      if (error) throw error;
      toast.success("Obrigado! Seu feedback foi enviado.");
      onOpenChange(false);
    } catch (e) {
      toast.error(friendlyDbError(e, "Não foi possível enviar agora. Tente novamente em instantes."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar feedback</DialogTitle>
          <DialogDescription>
            Sua opinião ajuda a melhorar o Volant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("bug")}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all",
                type === "bug" ? "border-primary bg-primary/5" : "border-border opacity-80"
              )}
            >
              <Bug className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold">Bug</span>
              <span className="text-[10px] leading-tight text-muted-foreground">Algo não funciona</span>
            </button>
            <button
              type="button"
              onClick={() => setType("suggestion")}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all",
                type === "suggestion" ? "border-primary bg-primary/5" : "border-border opacity-80"
              )}
            >
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold">Sugestão</span>
              <span className="text-[10px] leading-tight text-muted-foreground">Ideia de melhoria</span>
            </button>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "bug" ? "Ex: Erro ao salvar ganho" : "Ex: Filtro por semana"}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva com o máximo de detalhes possível."
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={sending}>
            {sending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>) : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
