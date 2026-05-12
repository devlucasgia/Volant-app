import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { EntryDrawer } from "./EntryDrawer";
import { CarOnboardingDialog } from "./CarOnboardingDialog";
import { TimerFab } from "./TimerFab";
import { useUI } from "@/context/UIContext";

export function AppLayout() {
  const { drawerOpen, setDrawerOpen, drawerPreset } = useUI();
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-32">
        <Outlet />
      </main>
      <TimerFab />
      <EntryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} preset={drawerPreset} />
      <BottomNav />
      <CarOnboardingDialog />
    </div>
  );
}
