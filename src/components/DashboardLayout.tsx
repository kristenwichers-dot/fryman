import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Users, MapPin, Calendar, FileText, MessageSquare, LogOut, ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/voters", label: "Voter Database", icon: Users },
  { to: "/door-knocking", label: "Door Knocking", icon: MapPin },
  { to: "/events", label: "Events & AI", icon: Calendar },
  { to: "/press-release", label: "Press Release", icon: FileText },
  { to: "/debate-prep", label: "Debate Prep", icon: MessageSquare },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={`flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
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
                {!collapsed && <span>{item.label}</span>}
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
            {!collapsed && <span>Log out</span>}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
