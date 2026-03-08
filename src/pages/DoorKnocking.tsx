import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, MapPin, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";

interface VoterRoute {
  id: string;
  last_name: string;
  first_name: string;
  street_address: string;
  city: string;
  party: string;
  notes: string;
  // door knock status (from door_knocking_logs)
  log_id: string | null;
  status: string;
  log_notes: string;
}

const STATUS_OPTIONS = [
  { value: "not_visited", label: "Not Visited", icon: Clock, color: "text-muted-foreground" },
  { value: "contacted", label: "Contacted", icon: CheckCircle2, color: "text-emerald-400" },
  { value: "not_home", label: "Not Home", icon: MapPin, color: "text-amber-400" },
  { value: "refused", label: "Refused", icon: Ban, color: "text-destructive" },
];

export default function DoorKnocking() {
  const [routes, setRoutes] = useState<VoterRoute[]>([]);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [logModal, setLogModal] = useState<VoterRoute | null>(null);
  const [logNote, setLogNote] = useState("");

  const fetchRoutes = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // Fetch all voters sorted by city then street
    const { data: voters } = await supabase
      .from("voters")
      .select("*")
      .eq("user_id", user.id)
      .order("city")
      .order("street_address");

    // Fetch existing door knock logs for this user
    const { data: logs } = await supabase
      .from("door_knocking_logs")
      .select("*")
      .eq("user_id", user.id);

    const logMap = new Map<string, any>();
    (logs || []).forEach((l: any) => {
      if (l.voter_id) logMap.set(l.voter_id, l);
    });

    if (voters) {
      setRoutes(
        voters.map((v: any) => {
          const log = logMap.get(v.id);
          return {
            id: v.id,
            last_name: v.last_name || "",
            first_name: v.first_name || "",
            street_address: v.street_address || "",
            city: v.city || "",
            party: v.party || "",
            notes: v.notes || "",
            log_id: log?.id || null,
            status: log?.status || "not_visited",
            log_notes: log?.notes || "",
          };
        })
      );
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const updateStatus = async (voter: VoterRoute, newStatus: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    if (voter.log_id) {
      await supabase.from("door_knocking_logs").update({ status: newStatus }).eq("id", voter.log_id);
    } else {
      await supabase.from("door_knocking_logs").insert({
        user_id: user.id,
        voter_id: voter.id,
        status: newStatus,
      });
    }
    fetchRoutes();
  };

  const saveLog = async () => {
    if (!logModal) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    if (logModal.log_id) {
      await supabase.from("door_knocking_logs").update({ notes: logNote }).eq("id", logModal.log_id);
    } else {
      await supabase.from("door_knocking_logs").insert({
        user_id: user.id,
        voter_id: logModal.id,
        status: "contacted",
        notes: logNote,
      });
    }
    toast.success("Note saved");
    setLogModal(null);
    setLogNote("");
    fetchRoutes();
  };

  const cities = [...new Set(routes.map((r) => r.city).filter(Boolean))];

  const filtered = routes.filter((r) => {
    const text = `${r.last_name} ${r.first_name} ${r.street_address} ${r.city}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const matchCity = filterCity === "all" || r.city === filterCity;
    return matchSearch && matchCity;
  });

  // Group by city for route display
  const grouped = filtered.reduce<Record<string, VoterRoute[]>>((acc, r) => {
    const key = r.city || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const stats = {
    total: filtered.length,
    visited: filtered.filter((r) => r.status !== "not_visited").length,
    contacted: filtered.filter((r) => r.status === "contacted").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Door Knocking Route</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} addresses • {stats.visited} visited • {stats.contacted} contacted
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search route..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Route grouped by city */}
      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No voters in your database yet. Add voters first to generate a route.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([city, voters], ci) => (
            <div key={city}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{city}</h2>
                <span className="text-xs text-muted-foreground">({voters.length} stops)</span>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-8">#</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Address</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Party</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-20">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {voters.map((v, i) => {
                      const statusInfo = STATUS_OPTIONS.find((s) => s.value === v.status) || STATUS_OPTIONS[0];
                      const StatusIcon = statusInfo.icon;
                      return (
                        <tr key={v.id} className="hover:bg-secondary/50 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium">{v.last_name}, {v.first_name}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{v.street_address}</td>
                          <td className="px-4 py-2.5">{v.party}</td>
                          <td className="px-4 py-2.5">
                            <Select value={v.status} onValueChange={(val) => updateStatus(v, val)}>
                              <SelectTrigger className="h-7 text-xs w-32 gap-1">
                                <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.color}`} />
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => { setLogModal(v); setLogNote(v.log_notes); }}
                            >
                              {v.log_notes ? "Edit" : "Add"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!logModal} onOpenChange={(o) => !o && setLogModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Door Knock Notes — {logModal?.last_name}, {logModal?.first_name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{logModal?.street_address}, {logModal?.city}</p>
          <Textarea value={logNote} onChange={(e) => setLogNote(e.target.value)} rows={4} placeholder="Notes from this visit..." />
          <Button variant="gold" onClick={saveLog}>Save Note</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
