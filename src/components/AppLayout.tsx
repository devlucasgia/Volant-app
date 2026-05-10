import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Fab } from "./Fab";
import { EntryDrawer } from "./EntryDrawer";
import { CarOnboardingDialog } from "./CarOnboardingDialog";
import { TimerFab } from "./TimerFab";
import { useUI } from "@/context/UIContext";

export function AppLayout() {
  const { drawerOpen, setDrawerOpen, openDrawer, drawerPreset } = useUI();
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-32">
        <Outlet />
      </main>
      <TimerFab />
      <Fab onClick={() => openDrawer()} />
      <EntryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} preset={drawerPreset} />
      <BottomNav />
      <CarOnboardingDialog />
    </div>
  );
}
