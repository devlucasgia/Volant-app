import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  APP_VERSION,
  APP_VERSION_STORAGE_KEY,
  RELEASE_NOTES,
} from "@/config/appVersion";

function readStoredVersion(): string | null {
  try {
    return localStorage.getItem(APP_VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredVersion(value: string): void {
  try {
    localStorage.setItem(APP_VERSION_STORAGE_KEY, value);
  } catch {
    /* noop */
  }
}

export function UpdateAvailableModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    } catch {
      // localStorage indisponível: não exibe modal, não quebra app.
      return;
    }

    if (stored === null) {
      // Primeiro acesso: grava silenciosamente, sem modal.
      writeStoredVersion(APP_VERSION);
      return;
    }

    if (stored !== APP_VERSION) {
      setOpen(true);
    }
  }, []);

  const handleUpdate = () => {
    writeStoredVersion(APP_VERSION);
    window.location.reload();
  };

  const bullets = RELEASE_NOTES.bullets ?? [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-border bg-background/95 px-5 pb-6 pt-5 backdrop-blur-lg"
      >
        <SheetHeader className="space-y-3 text-left">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Versão {APP_VERSION}
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight">
            {RELEASE_NOTES.title}
          </SheetTitle>
        </SheetHeader>

        {bullets.length > 0 && (
          <ul className="mt-4 space-y-2.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button className="h-11 w-full font-semibold" onClick={handleUpdate}>
            Atualizar agora
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Continuar sem atualizar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
