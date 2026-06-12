import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { EntryDrawer } from "./EntryDrawer";
import { CarOnboardingDialog } from "./CarOnboardingDialog";
import { VehicleCostsOnboardingDialog } from "./VehicleCostsOnboardingDialog";
import { PlanningOnboardingDialog } from "./PlanningOnboardingDialog";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { TimerFab } from "./TimerFab";
import { InstallPromptManager } from "./pwa/InstallPromptManager";
import { TrialEndingModal } from "./TrialEndingModal";
import { useUI } from "@/context/UIContext";

export function AppLayout() {
  const { drawerOpen, setDrawerOpen, drawerPreset, chromeHidden } = useUI();
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <main
        className={`mx-auto max-w-md ${chromeHidden ? "pb-0" : "pb-32"}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div key={location.pathname}>
          <Outlet />
        </div>
      </main>
      {!chromeHidden && <TimerFab />}
      <EntryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} preset={drawerPreset} />
      {!chromeHidden && <BottomNav />}
      <CarOnboardingDialog />
      <VehicleCostsOnboardingDialog />
      <PlanningOnboardingDialog />
      <OnboardingFlow />
      <InstallPromptManager />
      <TrialEndingModal />
    </div>
  );
}


