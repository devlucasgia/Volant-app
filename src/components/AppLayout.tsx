import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { ExpandableFab } from "./ExpandableFab";
import { EntryDrawer } from "./EntryDrawer";
import { CarOnboardingDialog } from "./CarOnboardingDialog";
import { TimerFab } from "./TimerFab";
import { useUI } from "@/context/UIContext";

export function AppLayout() {
  const { drawerOpen, setDrawerOpen, openDrawer, drawerPreset } = useUI();
  const location = useLocation();
  const isHome = location.pathname === "/";
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-32">
        <Outlet />
      </main>
      <TimerFab />
      {isHome && <ExpandableFab onPick={(kind) => openDrawer({ tab: kind })} />}
      <EntryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} preset={drawerPreset} />
      <BottomNav />
      <CarOnboardingDialog />
    </div>
  );
}
