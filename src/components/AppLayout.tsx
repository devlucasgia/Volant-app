import { useState } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Fab } from "./Fab";
import { EntryDrawer } from "./EntryDrawer";
import { CarOnboardingDialog } from "./CarOnboardingDialog";

export function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-24">
        <Outlet />
      </main>
      <Fab onClick={() => setOpen(true)} />
      <EntryDrawer open={open} onOpenChange={setOpen} />
      <BottomNav />
    </div>
  );
}
