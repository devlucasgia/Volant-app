import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Lightbulb, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { collectDeviceInfo } from "@/lib/deviceInfo";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SuggestionDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setContactEmail(user?.email ?? "");
    }
  }, [open, user?.email]);

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
      const { error } = await supabase.functions.invoke("send-feedback-email", {
        body: {
          type: "suggestion",
          title: title.trim(),
          description: description.trim(),
          contactEmail: contactEmail.trim() || undefined,
          deviceInfo: collectDeviceInfo(),
        },
      });
      if (error) throw error;
      toast.success("Feedback enviado com sucesso.");
      onOpenChange(false);
    } catch (e) {
      console.error("[SuggestionDialog]", e);
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
            <Lightbulb className="h-4 w-4 text-primary" /> Sugerir melhoria
          </DialogTitle>
          <DialogDescription>
            Tem alguma ideia para melhorar o Volant? Conte para nós.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título da sugestão</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Melhorar visual dos relatórios"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição da ideia</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique sua ideia e como ela ajudaria no dia a dia."
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
            {sending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>) : "Enviar sugestão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
