import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback discreto exibido enquanto chunks de rota carregam.
 * Mantém o chrome (AppLayout + BottomNav) visível porque ambos são eager.
 */
export function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-md space-y-3 px-4 py-6">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}
