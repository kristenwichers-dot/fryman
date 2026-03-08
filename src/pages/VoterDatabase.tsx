import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, BarChart3 } from "lucide-react";
import CsvImport from "@/components/CsvImport";
import MetricCard from "@/components/MetricCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Voter {
  id: string;
  name: string;
  address: string;
  party: string;
  notes: string;
}

const emptyVoter: Omit<Voter, "id"> = {
  name: "", address: "", party: "", notes: "",
};

export default function VoterDatabase() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [search, setSearch] = useState("");
  const [filterParty, setFilterParty] = useState("all");
  const [form, setForm] = useState(emptyVoter);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchVoters = async () => {
    const { data } = await supabase.from("voters").select("*").order("name");
    if (data) setVoters(data as Voter[]);
  };

  useEffect(() => { fetchVoters(); }, []);

  const handleSave = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    if (editingId) {
      const { error } = await supabase.from("voters").update(form).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Voter updated");
    } else {
      const { error } = await supabase.from("voters").insert({ ...form, user_id: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Voter added");
    }
    setOpen(false);
    setForm(emptyVoter);
    setEditingId(null);
    fetchVoters();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("voters").delete().eq("id", id);
    toast.success("Voter deleted");
    fetchVoters();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((v) => v.id)));
    }
  };

  const handleMassDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("voters").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`Deleted ${ids.length} voter(s)`);
    setSelectedIds(new Set());
    fetchVoters();
  };

  const handleDeleteAll = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { error } = await supabase.from("voters").delete().eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("All voters deleted");
    setSelectedIds(new Set());
    fetchVoters();
  };

  const startEdit = (v: Voter) => {
    setForm({ name: v.name, address: v.address, party: v.party, notes: v.notes });
    setEditingId(v.id);
    setOpen(true);
  };

  const runSentimentAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sentiment-analysis", {
        body: { voters: voters.map((v) => ({ id: v.id, notes: v.notes })) },
      });
      if (error) throw error;
      if (data?.concerns) setConcerns(data.concerns);
      if (data?.updates) {
        for (const u of data.updates) {
          await supabase.from("voters").update({ sentiment: u.sentiment }).eq("id", u.id);
        }
        fetchVoters();
      }
      toast.success("Sentiment analysis complete");
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const sentimentCounts = {
    positive: voters.filter((v) => v.sentiment === "positive").length,
    neutral: voters.filter((v) => v.sentiment === "neutral").length,
    negative: voters.filter((v) => v.sentiment === "negative").length,
  };

  const filtered = voters.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.address.toLowerCase().includes(search.toLowerCase());
    const matchParty = filterParty === "all" || v.party === filterParty;
    return matchSearch && matchParty;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Voter Database</h1>
        <div className="flex gap-2">
          <CsvImport onComplete={fetchVoters} />
          <Button variant="outline" onClick={runSentimentAnalysis} disabled={analyzing}>
            <BarChart3 className="mr-2 h-4 w-4" />
            {analyzing ? "Analyzing..." : "Run Sentiment Analysis"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all voters?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete every voter in your database. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyVoter); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button variant="gold"><Plus className="mr-2 h-4 w-4" />Add Voter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingId ? "Edit Voter" : "Add Voter"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Party</Label>
                  <Select value={form.party} onValueChange={(v) => setForm({ ...form, party: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Democrat">Democrat</SelectItem>
                      <SelectItem value="Republican">Republican</SelectItem>
                      <SelectItem value="Independent">Independent</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-1"><Label>Sentiment</Label>
                  <Select value={form.sentiment} onValueChange={(v) => setForm({ ...form, sentiment: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Add notes about this voter..." /></div>
              </div>
              <Button variant="gold" className="mt-4 w-full" onClick={handleSave}>Save</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sentiment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Positive" value={sentimentCounts.positive} variant="positive" />
        <MetricCard label="Neutral" value={sentimentCounts.neutral} variant="neutral" />
        <MetricCard label="Negative" value={sentimentCounts.negative} variant="negative" />
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-2">Community Concerns</p>
          {concerns.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={concerns}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
                <XAxis dataKey="topic" tick={{ fill: "hsl(0 0% 55%)", fontSize: 10 }} />
                <YAxis tick={{ fill: "hsl(0 0% 55%)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 14%)" }} />
                <Bar dataKey="count" fill="hsl(263 70% 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">Run analysis to see data</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search voters..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterParty} onValueChange={setFilterParty}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parties</SelectItem>
            <SelectItem value="Democrat">Democrat</SelectItem>
            <SelectItem value="Republican">Republican</SelectItem>
            <SelectItem value="Independent">Independent</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />Delete Selected ({selectedIds.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} voter(s)?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleMassDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 w-10">
                <Checkbox checked={filtered.length > 0 && selectedIds.size === filtered.length} onCheckedChange={toggleSelectAll} />
              </th>
              {["Name", "Address", "Party", "Sentiment", "Notes", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3">
                  <Checkbox checked={selectedIds.has(v.id)} onCheckedChange={() => toggleSelect(v.id)} />
                </td>
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.address}</td>
                <td className="px-4 py-3">{v.party}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    v.sentiment === "positive" ? "bg-emerald-500/20 text-emerald-400" :
                    v.sentiment === "negative" ? "bg-red-500/20 text-red-400" :
                    "bg-primary/20 text-primary"
                  }`}>{v.sentiment}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{v.notes}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No voters found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
