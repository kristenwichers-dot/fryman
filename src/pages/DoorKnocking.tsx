import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Download, Loader2, ChevronLeft, Sparkles, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface VoterPin {
  id: string;
  last_name: string;
  first_name: string;
  street_address: string;
  city: string;
  party: string;
  notes: string;
  log_id: string | null;
  status: string;
  log_notes: string;
}

const STATUS_OPTIONS = [
  { value: "not_visited", label: "Not Visited" },
  { value: "contacted", label: "Contacted" },
  { value: "not_home", label: "Not Home" },
  { value: "refused", label: "Refused" },
];

const STATUS_COLORS: Record<string, string> = {
  not_visited: "bg-muted text-muted-foreground",
  contacted: "bg-green-500/20 text-green-400 border-green-500/30",
  not_home: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  refused: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function DoorKnocking() {
  const [voters, setVoters] = useState<VoterPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<VoterPin | null>(null);
  const [logNote, setLogNote] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const fetchVoters = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // Paginate to fetch all voters beyond the 1000-row default limit
    const allVoters: any[] = [];
    const batchSize = 1000;
    let from = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("voters")
        .select("*")
        .eq("user_id", user.id)
        .order("city")
        .order("street_address")
        .range(from, from + batchSize - 1);
      if (!batch || batch.length === 0) break;
      allVoters.push(...batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }
    const voterData = allVoters;

    const { data: logs } = await supabase
      .from("door_knocking_logs")
      .select("*")
      .eq("user_id", user.id);

    const logMap = new Map<string, any>();
    (logs || []).forEach((l: any) => { if (l.voter_id) logMap.set(l.voter_id, l); });

    if (voterData) {
      setVoters(
        voterData.map((v: any) => {
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
    setLoading(false);
  };

  useEffect(() => { fetchVoters(); }, []);

  const cities = Array.from(new Set(voters.map((v) => v.city).filter(Boolean))).sort();
  const cityVoters = selectedCity ? voters.filter((v) => v.city === selectedCity) : [];

  const updateStatus = async (voter: VoterPin, newStatus: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    if (voter.log_id) {
      await supabase.from("door_knocking_logs").update({ status: newStatus }).eq("id", voter.log_id);
    } else {
      await supabase.from("door_knocking_logs").insert({ user_id: user.id, voter_id: voter.id, status: newStatus });
    }
    fetchVoters();
  };

  const saveLog = async () => {
    if (!logModal) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    if (logModal.log_id) {
      await supabase.from("door_knocking_logs").update({ notes: logNote }).eq("id", logModal.log_id);
    } else {
      await supabase.from("door_knocking_logs").insert({ user_id: user.id, voter_id: logModal.id, status: "contacted", notes: logNote });
    }
    toast.success("Note saved");
    setLogModal(null);
    setLogNote("");
    fetchVoters();
  };

  const downloadWalkList = () => {
    const list = selectedCity ? cityVoters : voters;
    const header = "Stop,Last Name,First Name,Street Address,City,Party,Status,Notes\n";
    const rows = list.map((v, i) =>
      [i + 1, v.last_name, v.first_name, `"${v.street_address}"`, v.city, v.party, v.status.replace("_", " "), `"${v.log_notes}"`].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `walk-list-${selectedCity || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Walk list downloaded");
  };

  const optimizeWalkList = async () => {
    if (!selectedCity) return;
    setAiLoading(true);
    setAiSuggestion(null);
    setAiDialogOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("walk-list-optimizer", {
        body: { city: selectedCity, voters: cityVoters },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiSuggestion(data.suggestion);
    } catch (e: any) {
      toast.error(e.message || "Failed to optimize walk list");
      setAiDialogOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── City grid view ───────────────────────────────────────────────
  if (!selectedCity) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Door Knocking</h1>
            <p className="text-sm text-muted-foreground">{voters.length} voters across {cities.length} cities</p>
          </div>
          <Button size="sm" variant="outline" onClick={downloadWalkList} disabled={voters.length === 0}>
            <Download className="mr-2 h-4 w-4" />Download All
          </Button>
        </div>

        {cities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Add voters to your database first</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {cities.map((city) => {
              const count = voters.filter((v) => v.city === city).length;
              const contacted = voters.filter((v) => v.city === city && v.status !== "not_visited").length;
              return (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2 w-full">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-sm truncate">{city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{count} voters</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: count > 0 ? `${(contacted / count) * 100}%` : "0%" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{contacted}/{count} visited</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Voter list view for selected city ───────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCity(null)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{selectedCity}</h1>
            <p className="text-xs text-muted-foreground">{cityVoters.length} voters</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={optimizeWalkList} disabled={aiLoading}>
            <Sparkles className="mr-2 h-4 w-4" />
            {aiLoading ? "Optimizing..." : "AI Optimize"}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadWalkList}>
            <Download className="mr-2 h-4 w-4" />Walk List
          </Button>
        </div>
      </div>

      {/* Voter list */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {cityVoters.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No voters in this city</p>
        ) : (
          cityVoters.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{v.last_name}, {v.first_name}</p>
                <p className="text-xs text-muted-foreground truncate">{v.street_address}</p>
                {v.party && (
                  <p className="text-xs text-muted-foreground">Party: {v.party}</p>
                )}
                {v.log_notes && (
                  <p className="text-xs text-primary/80 mt-1 truncate">📝 {v.log_notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={v.status} onValueChange={(val) => updateStatus(v, val)}>
                  <SelectTrigger className={`h-7 text-xs border w-32 ${STATUS_COLORS[v.status] || ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setLogModal(v); setLogNote(v.log_notes); }}
                >
                  {v.log_notes ? "✏️" : "📝"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Note dialog */}
      <Dialog open={!!logModal} onOpenChange={(o) => !o && setLogModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes — {logModal?.last_name}, {logModal?.first_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{logModal?.street_address}, {logModal?.city}</p>
          <Textarea value={logNote} onChange={(e) => setLogNote(e.target.value)} rows={4} placeholder="Notes from this visit..." />
          <Button variant="gold" onClick={saveLog}>Save Note</Button>
        </DialogContent>
      </Dialog>

      {/* AI Optimization dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(o) => !o && setAiDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Walk List Optimization — {selectedCity}
            </DialogTitle>
          </DialogHeader>
          {aiLoading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Analyzing voters and optimizing route…</span>
            </div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{aiSuggestion || ""}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
