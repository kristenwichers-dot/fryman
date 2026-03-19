import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Users, MapPin, Calendar, FileText, ArrowRight, SignpostBig, TrendingUp, UserCheck, Phone, DollarSign, GraduationCap, Zap, ClipboardList, CalendarCheck, Mail, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const sections = [
  { to: "/analytics", icon: TrendingUp, title: "Analytics", desc: "View campaign metrics, voter stats, and track your overall progress." },
  { to: "/voters", icon: Users, title: "Voter Database", desc: "Manage contacts, run AI sentiment analysis, and track community concerns." },
  { to: "/door-knocking", icon: MapPin, title: "Door Knocking", desc: "Plan optimized canvassing routes with an interactive map and status tracking." },
  { to: "/yard-signs", icon: SignpostBig, title: "Yard Sign List", desc: "Track yard sign requests and mark them delivered with a simple checklist." },
  { to: "/events", icon: Calendar, title: "Events", desc: "Organize campaign events and let AI optimize your daily schedule." },
  { to: "/press-release", icon: FileText, title: "Press Release Generator", desc: "Draft professional press releases with AI and edit in a rich text editor." },
  { to: "/outreach", icon: Phone, title: "Voter Outreach", desc: "Call voters with scripts, build text campaigns, and export for ContactsHelper." },
  { to: "/volunteers", icon: UserCheck, title: "Volunteer Management", desc: "Track volunteers, assign tasks, and log their hours." },
  { to: "/fundraising", icon: DollarSign, title: "Fundraising", desc: "Track donations, connect Anedot, and view fundraising progress." },
  { to: "/campaign-advisor", icon: GraduationCap, title: "Campaign Advisor", desc: "Get expert AI advice on Ohio election compliance, strategy, and fundraising." },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

interface BriefingTask {
  icon: typeof Calendar;
  label: string;
  detail: string;
}

interface AutoSummary { welcome_email: number; high_value_donor: number; }

export default function LandingPage() {
  const navigate = useNavigate();
  const [autoSummary, setAutoSummary] = useState<AutoSummary>({ welcome_email: 0, high_value_donor: 0 });
  const [briefingTasks, setBriefingTasks] = useState<BriefingTask[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, "yyyy-MM-dd");

      // Fetch automation logs & events in parallel
      const [autoRes, eventsRes] = await Promise.all([
        (supabase.from as any)("automation_logs")
          .select("automation_type, description")
          .gte("created_at", today.toISOString()),
        supabase.from("events")
          .select("title, date, time, location")
          .eq("date", todayStr),
      ]);

      // Automation summary
      const summary: AutoSummary = { welcome_email: 0, high_value_donor: 0 };
      if (autoRes.data) {
        autoRes.data.forEach((r: any) => {
          if (r.automation_type === "welcome_email") summary.welcome_email++;
          if (r.automation_type === "high_value_donor") summary.high_value_donor++;
        });
      }
      setAutoSummary(summary);

      // Build briefing tasks (top 3)
      const tasks: BriefingTask[] = [];

      // Today's events
      if (eventsRes.data) {
        eventsRes.data.forEach((e: any) => {
          tasks.push({
            icon: CalendarCheck,
            label: e.title,
            detail: [e.time, e.location].filter(Boolean).join(" — ") || "Today",
          });
        });
      }

      // Automation-driven tasks
      if (summary.high_value_donor > 0) {
        tasks.push({
          icon: Star,
          label: `Follow up with ${summary.high_value_donor} high-value donor${summary.high_value_donor > 1 ? "s" : ""}`,
          detail: "Flagged today — personal outreach recommended",
        });
      }
      if (summary.welcome_email > 0) {
        tasks.push({
          icon: Mail,
          label: `${summary.welcome_email} welcome email${summary.welcome_email > 1 ? "s" : ""} queued`,
          detail: "New supporters added today",
        });
      }

      setBriefingTasks(tasks.slice(0, 3));
    };
    fetchData();
  }, []);

  const hasAutomations = autoSummary.welcome_email > 0 || autoSummary.high_value_donor > 0;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-16 md:py-24">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-2xl mb-10">
        <div className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">Campaign Dashboard</div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">Cassaundra Fryman</h1>
        <p className="mt-3 text-lg md:text-xl text-accent font-semibold">for Huron County Commissioner</p>
        <p className="mt-4 text-muted-foreground leading-relaxed">Your all-in-one campaign headquarters — manage voters, plan canvassing routes, generate press releases, and prepare for debates, all powered by AI.</p>
      </motion.div>

      {/* Daily Briefing */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="w-full max-w-5xl mb-8">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Daily Briefing — Top Tasks</h2>
        </div>
        {briefingTasks.length > 0 ? (
          <div className="space-y-2">
            {briefingTasks.map((task, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 py-3 px-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {i + 1}
                  </div>
                  <task.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{task.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tasks for today — enjoy the day! 🎉</p>
        )}
      </motion.div>

      {/* Active Automations Widget */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="w-full max-w-5xl mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Active Automations — Today</h2>
        </div>
        {hasAutomations ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {autoSummary.welcome_email > 0 && (
              <Card><CardContent className="pt-4 text-center">
                <div className="text-xl font-bold text-primary">{autoSummary.welcome_email}</div>
                <div className="text-xs text-muted-foreground">Welcome Emails Queued</div>
              </CardContent></Card>
            )}
            {autoSummary.high_value_donor > 0 && (
              <Card><CardContent className="pt-4 text-center">
                <div className="text-xl font-bold text-primary">{autoSummary.high_value_donor}</div>
                <div className="text-xs text-muted-foreground">High-Value Donors Flagged</div>
              </CardContent></Card>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No automations yet today — they'll appear here as you add volunteers and donations.</p>
        )}
      </motion.div>

      {/* Section Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl">
        {sections.map((s) => (
          <motion.div key={s.to} variants={item} onClick={() => navigate(s.to)} className="group cursor-pointer rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-foreground">{s.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            <div className="mt-4 flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Open <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
