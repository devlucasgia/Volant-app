import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/friendlyErrors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
}

export function PasswordChangeDialog({ open, onOpenChange, email }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) return toast.error("A nova senha deve ter ao menos 6 caracteres.");
    if (next !== confirm) return toast.error("A confirmação não coincide com a nova senha.");
    if (next === current) return toast.error("A nova senha precisa ser diferente da atual.");

    setBusy(true);
    try {
      // Re-authenticate to confirm current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInErr) {
        toast.error("Senha atual incorreta.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) {
        toast.error(friendlyAuthError(error, "Não foi possível atualizar a senha. Tente novamente."));
        return;
      }
      toast.success("Senha atualizada com sucesso.");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(friendlyAuthError(err, "Não foi possível atualizar a senha. Tente novamente."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            Confirme a senha atual e defina uma nova senha para sua conta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Senha atual</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nova senha</Label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <p className="text-[11px] text-muted-foreground">Mínimo de 6 caracteres.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Confirmar nova senha</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...</>) : "Atualizar senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
