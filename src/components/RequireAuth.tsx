import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SplashScreen } from "./SplashScreen";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
