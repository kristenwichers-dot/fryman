import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, Download, Loader2, ChevronLeft, Sparkles, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

interface CitySummary {
  city: string;
  voter_count: number;
  contacted_count: number;
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
  const [citiesSummary, setCitiesSummary] = useState<CitySummary[]>([]);
  const [cityVoters, setCityVoters] = useState<VoterPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityLoading, setCityLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<VoterPin | null>(null);
  const [logNote, setLogNote] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiOrderedIndices, setAiOrderedIndices] = useState<number[] | null>(null);

  const fetchCities = useCallback(async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data, error } = await supabase.rpc("get_door_knocking_cities", { p_user_id: user.id });
    if (!error && data) {
      setCitiesSummary(data as CitySummary[]);
    }
    setLoading(false);
  }, []);

  const fetchCityVoters = useCallback(async (city: string) => {
    setCityLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setCityLoading(false); return; }

    const allVoters: any[] = [];
    const batchSize = 1000;
    let from = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("voters")
        .select("*")
        .eq("user_id", user.id)
        .eq("city", city)
        .order("street_address")
        .range(from, from + batchSize - 1);
      if (!batch || batch.length === 0) break;
      allVoters.push(...batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }

    const voterIds = allVoters.map((v) => v.id);
    let allLogs: any[] = [];
    for (let i = 0; i < voterIds.length; i += 1000) {
      const chunk = voterIds.slice(i, i + 1000);
      const { data: logs } = await supabase
        .from("door_knocking_logs")
        .select("*")
        .eq("user_id", user.id)
        .in("voter_id", chunk);
      if (logs) allLogs.push(...logs);
    }

    const logMap = new Map<string, any>();
    allLogs.forEach((l) => { if (l.voter_id) logMap.set(l.voter_id, l); });

    setCityVoters(
      allVoters.map((v: any) => {
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
    setCityLoading(false);
  }, []);

  useEffect(() => { fetchCities(); }, [fetchCities]);

  useEffect(() => {
    if (selectedCity) {
      fetchCityVoters(selectedCity);
    } else {
      setCityVoters([]);
    }
  }, [selectedCity, fetchCityVoters]);

  const totalVoters = citiesSummary.reduce((s, c) => s + c.voter_count, 0);

  const updateStatus = async (voter: VoterPin, newStatus: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    if (voter.log_id) {
      await supabase.from("door_knocking_logs").update({ status: newStatus }).eq("id", voter.log_id);
    } else {
      await supabase.from("door_knocking_logs").insert({ user_id: user.id, voter_id: voter.id, status: newStatus });
    }
    if (selectedCity) fetchCityVoters(selectedCity);
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
    if (selectedCity) fetchCityVoters(selectedCity);
  };

  const downloadWalkList = () => {
    const list = cityVoters;
    const cityLabel = selectedCity || "All Cities";

    const grouped = new Map<string, VoterPin[]>();
    const sorted = [...list].sort((a, b) => a.street_address.localeCompare(b.street_address));
    sorted.forEach((v) => {
      const key = v.street_address.trim().toUpperCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(v);
    });

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Walk List — ${cityLabel}`, 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 22);
    doc.setTextColor(0);

    const tableRows: string[][] = [];
    grouped.forEach((voterGroup, address) => {
      const voterNames = voterGroup
        .map((v) => {
          const party = v.party ? ` (${v.party.charAt(0).toUpperCase()})` : "";
          return `${v.first_name} ${v.last_name}${party}`;
        })
        .join("\n");
      tableRows.push([address, voterNames, "", ""]);
    });

    autoTable(doc, {
      startY: 27,
      head: [["Address", "Voters", "Status", "Notes"]],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", lineWidth: 0.3, lineColor: 180 },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25 },
        3: { cellWidth: 45 },
      },
      theme: "grid",
      alternateRowStyles: { fillColor: [255, 255, 255] },
    });

    doc.save(`walk-list-${cityLabel.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Walk list downloaded as PDF");
  };

  const downloadOptimizedPDF = () => {
    if (!aiOrderedIndices || !selectedCity) return;
    const orderedVoters = aiOrderedIndices.map((i) => cityVoters[i]).filter(Boolean);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Optimized Walk List — ${selectedCity}`, 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`AI-Optimized · Generated ${new Date().toLocaleDateString()}`, 14, 22);
    doc.setTextColor(0);

    const tableRows: string[][] = [];
    let stopNum = 0;
    let lastAddr = "";
    orderedVoters.forEach((v) => {
      const addr = v.street_address.trim().toUpperCase();
      if (addr !== lastAddr) { stopNum++; lastAddr = addr; }
      const party = v.party ? ` (${v.party.charAt(0).toUpperCase()})` : "";
      tableRows.push([String(stopNum), v.street_address, `${v.first_name} ${v.last_name}${party}`, "", ""]);
    });

    autoTable(doc, {
      startY: 27,
      head: [["#", "Address", "Voter", "Status", "Notes"]],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", lineWidth: 0.3, lineColor: 180 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 52 },
        2: { cellWidth: 55 },
        3: { cellWidth: 22 },
        4: { cellWidth: 45 },
      },
      theme: "grid",
    });
    doc.save(`optimized-walk-list-${selectedCity.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Optimized walk list downloaded");
  };

  const optimizeWalkList = async () => {
    if (!selectedCity) return;
    setAiLoading(true);
    setAiSuggestion(null);
    setAiOrderedIndices(null);
    setAiDialogOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("walk-list-optimizer", {
        body: { city: selectedCity, voters: cityVoters },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiSuggestion(data.suggestion);
      if (Array.isArray(data.orderedIndices)) setAiOrderedIndices(data.orderedIndices);
    } catch (e: any) {
      toast.error(e.message || "Failed to optimize walk list");
      setAiDialogOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] md:h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // City grid view
  if (!selectedCity) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Door Knocking</h1>
            <p className="text-sm text-muted-foreground">{totalVoters} voters across {citiesSummary.length} cities</p>
          </div>
        </div>

        {citiesSummary.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Add voters to your database first</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {citiesSummary.map((cs) => (
              <button
                key={cs.city}
                onClick={() => setSelectedCity(cs.city)}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 md:p-5 text-left hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className="flex items-center gap-2 w-full">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm truncate">{cs.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{cs.voter_count} voters</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: cs.voter_count > 0 ? `${(cs.contacted_count / cs.voter_count) * 100}%` : "0%" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{cs.contacted_count}/{cs.voter_count} visited</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Voter list view for selected city
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedCity(null); fetchCities(); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base md:text-lg font-bold">{selectedCity}</h1>
            <p className="text-xs text-muted-foreground">{cityLoading ? "Loading…" : `${cityVoters.length} voters`}</p>
          </div>
        </div>
        <div className="flex gap-2 ml-10 sm:ml-0">
          <Button size="sm" onClick={optimizeWalkList} disabled={aiLoading || cityLoading} className="flex-1 sm:flex-none">
            <Sparkles className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{aiLoading ? "Optimizing..." : "AI Optimize"}</span>
            <span className="sm:hidden">Optimize</span>
          </Button>
          <Button size="sm" variant="outline" onClick={downloadWalkList} disabled={cityLoading} className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Walk List</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {/* Voter list */}
      <div className="flex-1 overflow-auto p-3 md:p-4 space-y-2">
        {cityLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cityVoters.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No voters in this city</p>
        ) : (
          cityVoters.map((v) => (
            <div
              key={v.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border border-border bg-card px-3 md:px-4 py-3"
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
                  <SelectTrigger className={`h-7 text-xs border w-full sm:w-28 ${STATUS_COLORS[v.status] || ""}`}>
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
                  className="h-7 px-2 text-xs shrink-0"
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
          {!aiLoading && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-0.5">
              <p><span className="font-semibold text-foreground">#1, #2–3…</span> = suggested walking stop order</p>
              <p><span className="font-semibold text-foreground">(1382), (463)…</span> = house number from the street address</p>
              <p><span className="font-semibold text-foreground">Clusters</span> = roads grouped together to minimize backtracking</p>
            </div>
          )}
          {aiLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is analyzing your walk list...</p>
            </div>
          ) : aiSuggestion ? (
            <>
              <div className="prose prose-invert prose-sm max-w-none text-foreground">
                <ReactMarkdown>{aiSuggestion}</ReactMarkdown>
              </div>
              {aiOrderedIndices && (
                <Button variant="gold" className="mt-4" onClick={downloadOptimizedPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Optimized Walk List PDF
                </Button>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
