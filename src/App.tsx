import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
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
import { RequireAdmin } from "@/components/RequireAdmin";
import ScrollToTop from "@/components/ScrollToTop";
import { RouteFallback } from "@/components/RouteFallback";
import { ChunkErrorBoundary, clearChunkReloadFlag } from "@/components/ChunkErrorBoundary";
import { prefetchRoute, routeLoaders } from "@/lib/prefetchRoute";

// Eager: boot crítico (Landing, Auth) e Dashboard (rota mais visitada — evita flash em /app)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";

// Lazy: demais rotas
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Termos = lazy(() => import("./pages/Termos"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const History = lazy(() => routeLoaders.history());
const Reports = lazy(() => routeLoaders.reports());
const SettingsPage = lazy(() => routeLoaders.settings());
const PlanejamentoInteligente = lazy(() => import("./pages/PlanejamentoInteligente"));
const MetasInteligentes = lazy(() => import("./pages/MetasInteligentes"));
const KmInteligente = lazy(() => import("./pages/KmInteligente"));
const CentralVeiculos = lazy(() => import("./pages/CentralVeiculos"));
const MeusCarros = lazy(() => import("./pages/MeusCarros"));
const CustosVeiculo = lazy(() => import("./pages/CustosVeiculo"));
const ManutencaoPreventiva = lazy(() => import("./pages/ManutencaoPreventiva"));
const Personalizacao = lazy(() => import("./pages/Personalizacao"));
const PersonalizacaoAparencia = lazy(() => import("./pages/PersonalizacaoAparencia"));
const PersonalizacaoSaudacao = lazy(() => import("./pages/PersonalizacaoSaudacao"));
const OrganizacaoCards = lazy(() => import("./pages/OrganizacaoCards"));
const Categorias = lazy(() => import("./pages/Categorias"));
const CategoriasGanhos = lazy(() => import("./pages/CategoriasGanhos"));
const CategoriasGastos = lazy(() => import("./pages/CategoriasGastos"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminMetrics = lazy(() => import("./pages/AdminMetrics"));
const AdminHome = lazy(() => import("./pages/AdminHome"));
const AdminAccess = lazy(() => import("./pages/AdminAccess"));
const AdminSubscribers = lazy(() => import("./pages/AdminSubscribers"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

/**
 * Quando uma rota carrega com sucesso (location muda sem erro), limpa a flag
 * anti-loop. Assim um deploy futuro na mesma sessão volta a poder fazer o
 * reload automático uma única vez.
 */
function ChunkReloadFlagCleaner() {
  const location = useLocation();
  useEffect(() => {
    clearChunkReloadFlag();
  }, [location.pathname]);
  return null;
}

/**
 * Prefetch das rotas mais usadas do app logo após o boot, em idle.
 * Garante que ao clicar em Histórico/Relatórios/Mais o chunk já esteja em cache.
 */
function RoutePrefetcher() {
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const run = () => {
      prefetchRoute("history");
      prefetchRoute("reports");
      prefetchRoute("settings");
    };
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(run);
    else setTimeout(run, 1500);
  }, []);
  return null;
}

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
                <ChunkReloadFlagCleaner />
                <ChunkErrorBoundary>
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/termos" element={<Termos />} />
                      <Route path="/privacidade" element={<Privacidade />} />
                      <Route path="/unsubscribe" element={<Unsubscribe />} />
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route
                        path="/admin"
                        element={<RequireAdmin><AdminHome /></RequireAdmin>}
                      />
                      <Route
                        path="/admin/metrics"
                        element={<RequireAdmin><AdminMetrics /></RequireAdmin>}
                      />
                      <Route
                        path="/admin/access"
                        element={<RequireAdmin><AdminAccess /></RequireAdmin>}
                      />
                      <Route
                        path="/admin/subscribers"
                        element={<RequireAdmin><AdminSubscribers /></RequireAdmin>}
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
                  </Suspense>
                </ChunkErrorBoundary>
              </BrowserRouter>
            </UIProvider>
          </TimerProvider>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
