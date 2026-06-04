import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { Brain } from "lucide-react";

/**
 * Terceiro passo do onboarding pós-tour: convida a configurar o
 * Planejamento Inteligente. Sempre opcional.
 */
export function PlanningOnboardingDialog() {
  const { user } = useAuth();
  const { settings } = useData();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const markDone = async () => {
    if (!user) return;
    await supabase.from("profiles").upsert({ id: user.id, planning_onboarded: true } as any);
  };

  const checkAndOpen = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("onboarded, planning_onboarded")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return;
    const d = data as any;
    if (!d.onboarded || d.planning_onboarded) return;
    if (settings.planningStatus === "configured") {
      await markDone();
      return;
    }
    setOpen(true);
  };

  useEffect(() => {
    const onCostsFinished = () => { void checkAndOpen(); };
    window.addEventListener("volant:costs-onboarding-finished", onCostsFinished);
    return () => window.removeEventListener("volant:costs-onboarding-finished", onCostsFinished);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings.planningStatus]);

  const skip = async () => {
    setSaving(true);
    await markDone();
    setSaving(false);
    setOpen(false);
  };

  const goConfigure = async () => {
    setSaving(true);
    await markDone();
    setSaving(false);
    setOpen(false);
    navigate("/ajustes/planejamento");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) void skip(); }}>
      <DialogContent className="max-w-md z-[120] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Brain className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Planejamento Inteligente</DialogTitle>
          <DialogDescription className="text-center">
            Defina sua meta mensal e os dias que pretende rodar. O Volant calcula automaticamente
            sua meta diária e o R$/km ideal para fechar o mês.
            <br />
            <span className="text-[11px] text-muted-foreground/80">
              Você pode configurar quando quiser em Ajustes → Planejamento Inteligente.
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => void skip()} disabled={saving}>Agora não</Button>
          <Button onClick={() => void goConfigure()} disabled={saving}>
            Configurar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
