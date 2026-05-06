import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car } from "lucide-react";

export function CarOnboardingDialog() {
  const { user } = useAuth();
  const { refreshProfile } = useData();
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [initialKm, setInitialKm] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("car_onboarded")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && !data.car_onboarded) setOpen(true);
      });
  }, [user]);

  const finish = async (skip = false) => {
    if (!user) return;
    setSaving(true);
    const payload: any = { id: user.id, car_onboarded: true };
    if (!skip) {
      payload.car_brand = brand || null;
      payload.car_model = model || null;
      payload.car_plate = plate || null;
      payload.car_initial_km = parseFloat(initialKm) || 0;
    }
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar");
    setOpen(false);
    if (!skip) toast.success("Carro cadastrado!");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(true); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Car className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Cadastre seu carro</DialogTitle>
          <DialogDescription className="text-center">
            Opcional, mas ajuda a manter o controle de manutenção mais preciso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota" />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Corolla" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Placa</Label>
            <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" />
          </div>
          <div className="space-y-2">
            <Label>Quilometragem inicial</Label>
            <Input
              type="number" inputMode="decimal"
              value={initialKm}
              onChange={(e) => setInitialKm(e.target.value)}
              placeholder="Ex: 45000"
            />
            <p className="text-xs text-muted-foreground">
              Usaremos para acompanhar a manutenção real do carro.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => finish(true)} disabled={saving}>Pular</Button>
          <Button onClick={() => finish(false)} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
