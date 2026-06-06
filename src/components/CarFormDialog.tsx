import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/integrations/supabase/client";
import { Car as CarType } from "@/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  car?: CarType | null;
  /** Chamado após salvar com sucesso (criar ou editar). */
  onSaved?: (carId: string | null, created: boolean) => void;
}

export function CarFormDialog({ open, onOpenChange, car, onSaved }: Props) {
  const { user } = useAuth();
  const { refreshCars, cars } = useData();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [initialKm, setInitialKm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBrand(car?.brand || "");
      setModel(car?.model || "");
      setPlate(car?.plate || "");
      setInitialKm(car?.initial_km != null ? String(car.initial_km) : "");
    }
  }, [open, car]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload: any = {
      brand: brand || null,
      model: model || null,
      plate: plate || null,
      initial_km: parseFloat(initialKm) || 0,
    };
    let savedId: string | null = car?.id ?? null;
    let created = false;
    if (car) {
      const { error } = await supabase.from("cars").update(payload).eq("id", car.id);
      if (error) { setSaving(false); return toast.error("Erro ao salvar"); }
    } else {
      const isFirst = cars.length === 0;
      const { data: inserted, error } = await supabase
        .from("cars")
        .insert({ ...payload, user_id: user.id, is_active: isFirst })
        .select("id")
        .maybeSingle();
      if (error) { setSaving(false); return toast.error("Erro ao salvar"); }
      savedId = (inserted as any)?.id ?? null;
      created = true;
      await supabase.from("profiles").upsert({ id: user.id, car_onboarded: true });
    }
    await refreshCars();
    setSaving(false);
    onOpenChange(false);
    toast.success(car ? "Carro atualizado!" : "Carro adicionado!");
    onSaved?.(savedId, created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{car ? "Editar carro" : "Adicionar carro"}</DialogTitle>
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
            <Input type="number" inputMode="decimal" value={initialKm}
              onChange={(e) => setInitialKm(e.target.value)} placeholder="Ex: 45000" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
