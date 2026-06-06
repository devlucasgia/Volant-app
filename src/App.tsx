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
import ScrollToTop from "@/components/ScrollToTop";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Reports from "./pages/Reports";

import SettingsPage from "./pages/Settings";
import PlanejamentoInteligente from "./pages/PlanejamentoInteligente";
import MetasInteligentes from "./pages/MetasInteligentes";
import KmInteligente from "./pages/KmInteligente";
import CentralVeiculos from "./pages/CentralVeiculos";
import MeusCarros from "./pages/MeusCarros";
import CustosVeiculo from "./pages/CustosVeiculo";
import ManutencaoPreventiva from "./pages/ManutencaoPreventiva";
import Personalizacao from "./pages/Personalizacao";
import PersonalizacaoAparencia from "./pages/PersonalizacaoAparencia";
import PersonalizacaoSaudacao from "./pages/PersonalizacaoSaudacao";
import OrganizacaoCards from "./pages/OrganizacaoCards";
import Categorias from "./pages/Categorias";
import CategoriasGanhos from "./pages/CategoriasGanhos";
import CategoriasGastos from "./pages/CategoriasGastos";
import CheckoutReturn from "./pages/CheckoutReturn";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound.tsx";
import AdminMetrics from "./pages/AdminMetrics";

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
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/termos" element={<Termos />} />
                  <Route path="/privacidade" element={<Privacidade />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route
                    path="/admin/metrics"
                    element={
                      <RequireAuth>
                        <AdminMetrics />
                      </RequireAuth>
                    }
                  />
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
                    <Route path="/app" element={<Dashboard />} />
                    <Route path="/historico" element={<History />} />
                    <Route path="/relatorios" element={<Reports />} />
                    <Route path="/ajustes" element={<SettingsPage />} />
                    <Route path="/ajustes/planejamento" element={<PlanejamentoInteligente />} />
                    <Route path="/ajustes/planejamento/metas" element={<MetasInteligentes />} />
                    <Route path="/ajustes/planejamento/km" element={<KmInteligente />} />
                    <Route path="/ajustes/veiculos" element={<CentralVeiculos />} />
                    <Route path="/ajustes/veiculos/carros" element={<MeusCarros />} />
                    <Route path="/ajustes/veiculos/custos" element={<CustosVeiculo />} />
                    <Route path="/ajustes/veiculos/manutencao" element={<ManutencaoPreventiva />} />
                    <Route path="/ajustes/personalizacao" element={<Personalizacao />} />
                    <Route path="/ajustes/personalizacao/aparencia" element={<PersonalizacaoAparencia />} />
                    <Route path="/ajustes/personalizacao/saudacao" element={<PersonalizacaoSaudacao />} />
                    <Route path="/ajustes/personalizacao/cards" element={<OrganizacaoCards />} />
                    <Route path="/ajustes/categorias" element={<Categorias />} />
                    <Route path="/ajustes/categorias/ganhos" element={<CategoriasGanhos />} />
                    <Route path="/ajustes/categorias/gastos" element={<CategoriasGastos />} />
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
