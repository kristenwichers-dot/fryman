import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, SignpostBig, Calendar, Phone, UserCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface Stats {
  totalVoters: number;
  doorsKnocked: number;
  signsDelivered: number;
  signsTotal: number;
  upcomingEvents: number;
  totalCalls: number;
  totalVolunteers: number;
  votersByParty: { party: string; count: number }[];
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats>({
    totalVoters: 0,
    doorsKnocked: 0,
    signsDelivered: 0,
    signsTotal: 0,
    upcomingEvents: 0,
    totalCalls: 0,
    totalVolunteers: 0,
    votersByParty: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const [
        votersRes,
        doorsRes,
        signsRes,
        eventsRes,
        callsRes,
        volunteersRes,
      ] = await Promise.all([
        supabase.from("voters").select("id, party", { count: "exact" }).eq("user_id", user.id),
        supabase.from("door_knocking_logs").select("id", { count: "exact" }).eq("user_id", user.id).neq("status", "not_visited"),
        supabase.from("yard_sign_requests").select("id, delivered", { count: "exact" }).eq("user_id", user.id),
        supabase.from("events").select("id", { count: "exact" }).eq("user_id", user.id).gte("date", new Date().toISOString().split("T")[0]),
        supabase.from("call_logs").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("volunteers").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);

      // Calculate voters by party
      const partyCount: Record<string, number> = {};
      votersRes.data?.forEach((v) => {
        const party = v.party || "Unknown";
        partyCount[party] = (partyCount[party] || 0) + 1;
      });
      const votersByParty = Object.entries(partyCount).map(([party, count]) => ({ party, count }));

      setStats({
        totalVoters: votersRes.count || 0,
        doorsKnocked: doorsRes.count || 0,
        signsDelivered: signsRes.data?.filter((s) => s.delivered).length || 0,
        signsTotal: signsRes.count || 0,
        upcomingEvents: eventsRes.count || 0,
        totalCalls: callsRes.count || 0,
        totalVolunteers: volunteersRes.count || 0,
        votersByParty,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const metrics = [
    { label: "Total Voters", value: stats.totalVoters, icon: Users, color: "text-blue-500" },
    { label: "Doors Knocked", value: stats.doorsKnocked, icon: MapPin, color: "text-green-500" },
    { label: "Signs Delivered", value: `${stats.signsDelivered}/${stats.signsTotal}`, icon: SignpostBig, color: "text-amber-500" },
    { label: "Upcoming Events", value: stats.upcomingEvents, icon: Calendar, color: "text-purple-500" },
    { label: "Phone Calls Made", value: stats.totalCalls, icon: Phone, color: "text-pink-500" },
    { label: "Volunteers", value: stats.totalVolunteers, icon: UserCheck, color: "text-cyan-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h1 className="text-xl md:text-2xl font-bold">Campaign Analytics</h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
                <m.icon className={`h-5 w-5 ${m.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold">{m.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Voters by Party */}
      {stats.votersByParty.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voters by Party</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.votersByParty.map((p) => (
                <div key={p.party} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-muted-foreground">{p.party}</div>
                  <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(p.count / stats.totalVoters) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm font-medium text-right">{p.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
