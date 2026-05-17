import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { EntryDrawer } from "./EntryDrawer";
import { CarOnboardingDialog } from "./CarOnboardingDialog";
import { MonthlyGoalOnboardingDialog } from "./MonthlyGoalOnboardingDialog";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { TimerFab } from "./TimerFab";
import { useUI } from "@/context/UIContext";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";

export function AppLayout() {
  const { drawerOpen, setDrawerOpen, drawerPreset } = useUI();
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <main className="mx-auto max-w-md pb-32">
        <div key={location.pathname} className="animate-fade-in-up">
          <Outlet />
        </div>
      </main>
      <TimerFab />
      <EntryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} preset={drawerPreset} />
      <BottomNav />
      <CarOnboardingDialog />
      <MonthlyGoalOnboardingDialog />
      <OnboardingFlow />
    </div>
  );
}
