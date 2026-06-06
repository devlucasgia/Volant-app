import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
const volantIcon = "/volant-app-icon-192.png";

interface Props {
  open: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  title?: string;
  description?: string;
}

function Body({ onInstall, onDismiss, title, description, showCustomClose }: Omit<Props, "open"> & { showCustomClose?: boolean }) {
  return (
    <div className="px-5 pb-6 pt-2">
      {showCustomClose ? (
        <DrawerClose asChild>
          <button
            aria-label="Fechar"
            className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted/60"
          >
            <X className="h-4 w-4" />
          </button>
        </DrawerClose>
      ) : null}

      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl" aria-hidden />
          <img
            src={volantIcon}
            alt="Volant"
            className="relative h-16 w-16 rounded-2xl shadow-lg"
          />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title ?? "Instale o Volant"}
        </h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {description ?? "Acesse sua rotina mais rápido, direto da tela inicial."}
        </p>

        <div className="mt-6 grid w-full gap-2">
          <Button
            onClick={onInstall}
            className="h-11 w-full bg-primary text-primary-foreground shadow-[0_0_30px_-8px_hsl(var(--primary)/0.55)] hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Instalar agora
          </Button>
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="h-10 w-full text-muted-foreground hover:text-foreground"
          >
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InstallPromptCard({ open, onInstall, onDismiss, title, description }: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
        <DrawerContent className="border-border/60 bg-card">
          <div className="relative">
            <Body onInstall={onInstall} onDismiss={onDismiss} title={title} description={description} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent className="max-w-sm border-border/60 bg-card p-0">
        <div className="relative">
          <Body onInstall={onInstall} onDismiss={onDismiss} title={title} description={description} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
