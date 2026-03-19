import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Users, MapPin, Calendar, FileText, MessageSquare, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, SignpostBig, Menu, TrendingUp, UserCheck, Phone, DollarSign, MessageCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CampaignAssistant from "@/components/CampaignAssistant";
import OnboardingTour from "@/components/OnboardingTour";

const navItems = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/voters", label: "Voter Database", icon: Users },
  { to: "/door-knocking", label: "Door Knocking", icon: MapPin },
  { to: "/yard-signs", label: "Yard Signs", icon: SignpostBig },
  { to: "/events", label: "Events & AI", icon: Calendar },
  { to: "/press-release", label: "Press Release", icon: FileText },
  { to: "/debate-prep", label: "Debate Prep", icon: MessageSquare },
  { to: "/phone-banking", label: "Phone Banking", icon: Phone },
  { to: "/volunteers", label: "Volunteers", icon: UserCheck },
  { to: "/fundraising", label: "Fundraising", icon: DollarSign },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/auth");
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(mobile || !collapsed) && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(mobile || !collapsed) && <span>Log out</span>}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 md:hidden">
        <NavLink to="/" className="text-lg font-bold text-primary">
          Campaign HQ
        </NavLink>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-border">
            <div className="flex h-14 items-center border-b border-border px-4">
              <NavLink to="/" className="text-lg font-bold text-primary">
                Campaign HQ
              </NavLink>
            </div>
            <div className="flex flex-col h-[calc(100%-56px)]">
              <NavContent mobile />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          {!collapsed && (
            <NavLink to="/" className="text-lg font-bold text-primary hover:text-primary/80 transition-colors">
              Campaign HQ
            </NavLink>
          )}
          {collapsed && (
            <NavLink to="/" className="text-primary hover:text-primary/80 transition-colors">
              <LayoutDashboard className="h-5 w-5" />
            </NavLink>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <NavContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>

      {/* Campaign Assistant Chatbot */}
      <CampaignAssistant />

      {/* Onboarding Tour */}
      <OnboardingTour />
    </div>
  );
}
