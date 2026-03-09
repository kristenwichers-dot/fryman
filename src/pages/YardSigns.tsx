import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, MapPin, Phone, Mail, Trash2, Search } from "lucide-react";

interface YardSignRequest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  street_address: string;
  city: string;
  notes: string | null;
  delivered: boolean;
  created_at: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  street_address: "",
  city: "",
  notes: "",
};

export default function YardSigns() {
  const [requests, setRequests] = useState<YardSignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "delivered">("all");

  const fetchRequests = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data, error } = await supabase
      .from("yard_sign_requests" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load requests"); return; }
    setRequests((data as unknown as YardSignRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.street_address.trim() || !form.city.trim()) {
      toast.error("Name, address, and city are required.");
      return;
    }
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { error } = await supabase.from("yard_sign_requests" as any).insert({
      user_id: user.id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      street_address: form.street_address.trim(),
      city: form.city.trim(),
      notes: form.notes.trim() || null,
      delivered: false,
    });
    if (error) { toast.error("Failed to save request"); setSaving(false); return; }
    toast.success("Yard sign request added!");
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
    fetchRequests();
  };

  const toggleDelivered = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("yard_sign_requests" as any)
      .update({ delivered: !current })
      .eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, delivered: !current } : r))
    );
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("yard_sign_requests" as any).delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setRequests((prev) => prev.filter((r) => r.id !== id));
    toast.success("Request removed.");
  };

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.street_address.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "delivered" && r.delivered) ||
      (filter === "pending" && !r.delivered);
    return matchesSearch && matchesFilter;
  });

  const totalCount = requests.length;
  const deliveredCount = requests.filter((r) => r.delivered).length;
  const pendingCount = totalCount - deliveredCount;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Yard Sign List</h1>
          <p className="text-sm text-muted-foreground">Track who needs a yard sign and mark them delivered</p>
        </div>
        <Button variant="gold" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Add Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Requests</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{deliveredCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Delivered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "delivered"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {requests.length === 0 ? "No yard sign requests yet. Add one to get started!" : "No results match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
                req.delivered ? "border-border bg-muted/30 opacity-70" : "border-border bg-card"
              }`}
            >
              <Checkbox
                checked={req.delivered}
                onCheckedChange={() => toggleDelivered(req.id, req.delivered)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-semibold ${req.delivered ? "line-through text-muted-foreground" : ""}`}>
                    {req.name}
                  </p>
                  <Badge variant={req.delivered ? "secondary" : "outline"} className={req.delivered ? "" : "border-amber-500 text-amber-500"}>
                    {req.delivered ? "Delivered" : "Pending"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{req.street_address}, {req.city}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-1">
                  {req.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {req.phone}
                    </span>
                  )}
                  {req.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {req.email}
                    </span>
                  )}
                </div>
                {req.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{req.notes}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(req.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Yard Sign Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-000-1234" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
              </div>
            </div>
            <div>
              <Label>Street Address <span className="text-destructive">*</span></Label>
              <Input value={form.street_address} onChange={(e) => setForm({ ...form, street_address: e.target.value })} placeholder="123 Main St" />
            </div>
            <div>
              <Label>City <span className="text-destructive">*</span></Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Springfield" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Corner lot, prefers front yard..." />
            </div>
            <Button variant="gold" className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Add Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
