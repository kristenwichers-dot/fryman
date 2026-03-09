import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, UserCheck, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  hours_logged: number;
  tasks_completed: number;
  notes: string;
}

const emptyVolunteer = { name: "", email: "", phone: "", hours_logged: 0, tasks_completed: 0, notes: "" };

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyVolunteer);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchVolunteers = async () => {
    const { data } = await supabase.from("volunteers").select("*").order("name");
    if (data) setVolunteers(data as Volunteer[]);
  };

  useEffect(() => { fetchVolunteers(); }, []);

  const handleSave = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    if (editingId) {
      const { error } = await supabase.from("volunteers").update({
        name: form.name,
        email: form.email,
        phone: form.phone,
        hours_logged: form.hours_logged,
        tasks_completed: form.tasks_completed,
        notes: form.notes,
      }).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Volunteer updated");
    } else {
      const { error } = await supabase.from("volunteers").insert({
        ...form,
        user_id: user.id,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Volunteer added");
    }
    setOpen(false);
    setForm(emptyVolunteer);
    setEditingId(null);
    fetchVolunteers();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("volunteers").delete().eq("id", id);
    toast.success("Volunteer removed");
    fetchVolunteers();
  };

  const startEdit = (v: Volunteer) => {
    setForm({ name: v.name, email: v.email, phone: v.phone, hours_logged: v.hours_logged, tasks_completed: v.tasks_completed, notes: v.notes });
    setEditingId(v.id);
    setOpen(true);
  };

  const logHour = async (v: Volunteer) => {
    await supabase.from("volunteers").update({ hours_logged: v.hours_logged + 1 }).eq("id", v.id);
    toast.success("Hour logged!");
    fetchVolunteers();
  };

  const logTask = async (v: Volunteer) => {
    await supabase.from("volunteers").update({ tasks_completed: v.tasks_completed + 1 }).eq("id", v.id);
    toast.success("Task completed!");
    fetchVolunteers();
  };

  const filtered = volunteers.filter((v) =>
    `${v.name} ${v.email} ${v.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalHours = volunteers.reduce((sum, v) => sum + Number(v.hours_logged), 0);
  const totalTasks = volunteers.reduce((sum, v) => sum + v.tasks_completed, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserCheck className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Volunteer Management</h1>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Volunteer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{volunteers.length}</div>
            <div className="text-xs text-muted-foreground">Volunteers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{totalHours}</div>
            <div className="text-xs text-muted-foreground">Hours Logged</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="text-xs text-muted-foreground">Tasks Done</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search volunteers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Volunteer List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No volunteers yet. Add your first volunteer!</div>
        ) : (
          filtered.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{v.name}</p>
                    {(v.email || v.phone) && (
                      <p className="text-sm text-muted-foreground truncate">
                        {v.email}{v.email && v.phone && " • "}{v.phone}
                      </p>
                    )}
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{v.hours_logged} hrs</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{v.tasks_completed} tasks</span>
                    </div>
                    {v.notes && <p className="text-xs text-muted-foreground mt-1 italic">{v.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => logHour(v)}>
                      <Clock className="h-3 w-3 mr-1" />+1 hr
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => logTask(v)}>
                      <CheckCircle className="h-3 w-3 mr-1" />+1 task
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(v)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyVolunteer); setEditingId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Volunteer" : "Add Volunteer"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Hours Logged</Label><Input type="number" value={form.hours_logged} onChange={(e) => setForm({ ...form, hours_logged: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Tasks Completed</Label><Input type="number" value={form.tasks_completed} onChange={(e) => setForm({ ...form, tasks_completed: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <Button className="mt-4 w-full" onClick={handleSave}>Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
