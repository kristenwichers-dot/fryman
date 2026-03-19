import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./components/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import VoterDatabase from "./pages/VoterDatabase";
import DoorKnocking from "./pages/DoorKnocking";
import EventsScheduler from "./pages/EventsScheduler";
import PressRelease from "./pages/PressRelease";
import DebatePrep from "./pages/DebatePrep";
import YardSigns from "./pages/YardSigns";
import Analytics from "./pages/Analytics";
import Volunteers from "./pages/Volunteers";
import PhoneBanking from "./pages/PhoneBanking";
import Fundraising from "./pages/Fundraising";
import Texting from "./pages/Texting";
import CampaignAdvisor from "./pages/CampaignAdvisor";
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
  return <DashboardLayout>{children}</DashboardLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<AuthGuard><LandingPage /></AuthGuard>} />
          <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
          <Route path="/voters" element={<AuthGuard><VoterDatabase /></AuthGuard>} />
          <Route path="/door-knocking" element={<AuthGuard><DoorKnocking /></AuthGuard>} />
          <Route path="/phone-banking" element={<AuthGuard><PhoneBanking /></AuthGuard>} />
          <Route path="/volunteers" element={<AuthGuard><Volunteers /></AuthGuard>} />
          <Route path="/events" element={<AuthGuard><EventsScheduler /></AuthGuard>} />
          <Route path="/press-release" element={<AuthGuard><PressRelease /></AuthGuard>} />
          <Route path="/debate-prep" element={<AuthGuard><DebatePrep /></AuthGuard>} />
          <Route path="/yard-signs" element={<AuthGuard><YardSigns /></AuthGuard>} />
          <Route path="/fundraising" element={<AuthGuard><Fundraising /></AuthGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

