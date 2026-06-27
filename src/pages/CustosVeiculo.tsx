import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";
import { VehicleCostsCard } from "@/components/vehicle/VehicleCostsCard";
import { Button } from "@/components/ui/button";
import { useUI } from "@/context/UIContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CustosVeiculo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { useHideChrome } = useUI();
  useHideChrome();
  const state = location.state as
    | { returnTo?: string; planningResume?: unknown }
    | null;
  const returnTo = state?.returnTo;
  const planningResume = state?.planningResume;

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const saveRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const goBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo, {
        state: planningResume ? { planningResume } : undefined,
      });
    } else {
      navigate("/ajustes/veiculos");
    }
  }, [navigate, returnTo, planningResume]);

  const handleBack = () => {
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    goBack();
  };

  const handleSave = async () => {
    const fn = saveRef.current;
    if (!fn) return;
    await fn();
  };

  const registerSave = useCallback((fn: (() => Promise<boolean>) | null) => {
    saveRef.current = fn;
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted/50 active:scale-[0.96]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-foreground/70 ring-1 ring-inset ring-current/15 shadow-[0_0_12px_-6px_currentColor]">
            <Wallet className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold leading-tight tracking-tight text-foreground">
              Custos
            </h1>
            <p className="text-[11px] leading-tight text-muted-foreground/80">
              Custos fixos e variáveis usados nos cálculos do Volant.
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 animate-fade-in">
        <VehicleCostsCard
          onDirtyChange={setDirty}
          onSavingChange={setSaving}
          registerSave={registerSave}
        />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="px-4 py-3">
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="w-full gradient-success text-primary-foreground"
          >
            {saving ? "Salvando..." : "Salvar custos"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                goBack();
              }}
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
