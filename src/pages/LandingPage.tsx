import { useNavigate } from "react-router-dom";
import { Users, MapPin, Calendar, FileText, MessageSquare, ArrowRight, SignpostBig, TrendingUp, UserCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const sections = [
  {
    to: "/analytics",
    icon: TrendingUp,
    title: "Analytics",
    desc: "View campaign metrics, voter stats, and track your overall progress.",
  },
  {
    to: "/voters",
    icon: Users,
    title: "Voter Database",
    desc: "Manage contacts, run AI sentiment analysis, and track community concerns.",
  },
  {
    to: "/door-knocking",
    icon: MapPin,
    title: "Door Knocking",
    desc: "Plan optimized canvassing routes with an interactive map and status tracking.",
  },
  {
    to: "/phone-banking",
    icon: Phone,
    title: "Phone Banking",
    desc: "Call voters with customizable scripts and track call outcomes.",
  },
  {
    to: "/volunteers",
    icon: UserCheck,
    title: "Volunteer Management",
    desc: "Track volunteers, assign tasks, and log their hours.",
  },
  {
    to: "/yard-signs",
    icon: SignpostBig,
    title: "Yard Sign List",
    desc: "Track yard sign requests and mark them delivered with a simple checklist.",
  },
  {
    to: "/events",
    icon: Calendar,
    title: "Events & AI Scheduler",
    desc: "Organize campaign events and let AI optimize your daily schedule.",
  },
  {
    to: "/press-release",
    icon: FileText,
    title: "Press Release Generator",
    desc: "Draft professional press releases with AI and edit in a rich text editor.",
  },
  {
    to: "/debate-prep",
    icon: MessageSquare,
    title: "Debate Prep Bot",
    desc: "Practice debates against a configurable AI opponent to sharpen your arguments.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-16 md:py-24">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl mb-16"
      >
        <div className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
          Campaign Dashboard
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
          Cassaundra Fryman
        </h1>
        <p className="mt-3 text-lg md:text-xl text-accent font-semibold">
          for Huron County Commissioner
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Your all-in-one campaign headquarters — manage voters, plan canvassing routes,
          generate press releases, and prepare for debates, all powered by AI.
        </p>
      </motion.div>

      {/* Section Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-5xl"
      >
        {sections.map((s) => (
          <motion.div
            key={s.to}
            variants={item}
            onClick={() => navigate(s.to)}
            className="group cursor-pointer rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
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
