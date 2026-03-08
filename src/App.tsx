import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./components/DashboardLayout";
import VoterDatabase from "./pages/VoterDatabase";
import DoorKnocking from "./pages/DoorKnocking";
import EventsScheduler from "./pages/EventsScheduler";
import PressRelease from "./pages/PressRelease";
import DebatePrep from "./pages/DebatePrep";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/voters" replace />} />
                    <Route path="/voters" element={<VoterDatabase />} />
                    <Route path="/door-knocking" element={<DoorKnocking />} />
                    <Route path="/events" element={<EventsScheduler />} />
                    <Route path="/press-release" element={<PressRelease />} />
                    <Route path="/debate-prep" element={<DebatePrep />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </DashboardLayout>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
