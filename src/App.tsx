import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { TimerProvider } from "@/context/TimerContext";
import { UIProvider } from "@/context/UIContext";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { RequirePremium } from "@/components/RequirePremium";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Reports from "./pages/Reports";

import SettingsPage from "./pages/Settings";
import PlanejamentoInteligente from "./pages/PlanejamentoInteligente";
import MetasInteligentes from "./pages/MetasInteligentes";
import KmInteligente from "./pages/KmInteligente";
import CheckoutReturn from "./pages/CheckoutReturn";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <TimerProvider>
            <UIProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  {/* Checkout return must bypass the paywall so the webhook can confirm */}
                  <Route
                    path="/checkout/return"
                    element={
                      <RequireAuth>
                        <CheckoutReturn />
                      </RequireAuth>
                    }
                  />
                  <Route
                    element={
                      <RequireAuth>
                        <RequirePremium>
                          <AppLayout />
                        </RequirePremium>
                      </RequireAuth>
                    }
                  >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/historico" element={<History />} />
                    <Route path="/relatorios" element={<Reports />} />
                    <Route path="/ajustes" element={<SettingsPage />} />
                    <Route path="/ajustes/planejamento" element={<PlanejamentoInteligente />} />
                    <Route path="/ajustes/planejamento/metas" element={<MetasInteligentes />} />
                    <Route path="/ajustes/planejamento/km" element={<KmInteligente />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </UIProvider>
          </TimerProvider>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
