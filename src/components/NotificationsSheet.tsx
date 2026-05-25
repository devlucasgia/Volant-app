import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { BellOff } from "lucide-react";

/**
 * Central de Notificações — base visual.
 * Esta sprint apenas estrutura a tela; regras inteligentes ficam para a próxima.
 * Categorias previstas: metas, KM Inteligente, veículo, manutenção, assinatura, sistema.
 */
export function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-base font-semibold">Notificações</DrawerTitle>
            <DrawerDescription className="text-[12px]">
              Acompanhe avisos importantes do Volant.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-10 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground/80 ring-1 ring-inset ring-border/60">
                <BellOff className="h-5 w-5" />
              </span>
              <div className="text-[14px] font-semibold text-foreground">
                Nenhuma notificação por enquanto.
              </div>
              <div className="max-w-[260px] text-[12px] leading-snug text-muted-foreground">
                Quando houver algo importante sobre suas metas, veículo ou assinatura, você verá aqui.
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
