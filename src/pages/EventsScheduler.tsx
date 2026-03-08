import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface CampaignEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

export default function EventsScheduler() {
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventForm, setEventForm] = useState({ title: "", date: "", time: "", location: "", description: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState("");
  const [showOptModal, setShowOptModal] = useState(false);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("date");
    if (data) setEvents(data as CampaignEvent[]);
  };

  useEffect(() => { fetchEvents(); }, []);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDow = days[0].getDay();

  const handleSave = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    if (editingId) {
      await supabase.from("events").update(eventForm).eq("id", editingId);
      toast.success("Event updated");
    } else {
      await supabase.from("events").insert({ ...eventForm, user_id: user.id });
      toast.success("Event created");
    }
    setShowForm(false);
    setEventForm({ title: "", date: "", time: "", location: "", description: "" });
    setEditingId(null);
    fetchEvents();
  };

  const handleOptimize = async () => {
    if (!selectedDate) { toast.error("Select a date first"); return; }
    setOptimizing(true);
    try {
      const dayEvents = events.filter((e) => e.date === format(selectedDate, "yyyy-MM-dd"));
      const { data, error } = await supabase.functions.invoke("schedule-optimizer", {
        body: { events: dayEvents, date: format(selectedDate, "yyyy-MM-dd") },
      });
      if (error) throw error;
      setOptimizationResult(data?.suggestion || "No suggestions available.");
      setShowOptModal(true);
    } catch (err: any) {
      toast.error(err.message || "Optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  const dayEvents = (day: Date) => events.filter((e) => isSameDay(new Date(e.date), day));

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Calendar */}
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Events & AI Scheduler</h1>
          <Button variant="gold" onClick={handleOptimize} disabled={optimizing}>
            <Sparkles className="mr-2 h-4 w-4" />
            {optimizing ? "Optimizing..." : "Optimize Schedule"}
          </Button>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-px rounded-xl border border-border overflow-hidden bg-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-secondary p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-card p-2 min-h-[80px]" />
          ))}
          {days.map((day) => {
            const de = dayEvents(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`bg-card p-2 min-h-[80px] cursor-pointer transition-colors hover:bg-secondary/50 ${
                  isSelected ? "ring-2 ring-primary ring-inset" : ""
                } ${!isSameMonth(day, currentMonth) ? "opacity-40" : ""}`}
              >
                <p className="text-xs font-medium">{format(day, "d")}</p>
                {de.slice(0, 2).map((ev) => (
                  <div key={ev.id} className="mt-1 truncate rounded bg-primary/20 px-1 py-0.5 text-[10px] text-primary cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setEventForm({ title: ev.title, date: ev.date, time: ev.time, location: ev.location, description: ev.description }); setEditingId(ev.id); setShowForm(true); }}>
                    {ev.title}
                  </div>
                ))}
                {de.length > 2 && <p className="text-[10px] text-muted-foreground">+{de.length - 2} more</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      <div className="w-80 border-l border-border bg-card p-6 space-y-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a day"}
          </h3>
          <Button size="sm" variant="gold" onClick={() => {
            setEventForm({ title: "", date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "", time: "", location: "", description: "" });
            setEditingId(null);
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {selectedDate && dayEvents(selectedDate).map((ev) => (
          <div key={ev.id} className="rounded-lg border border-border p-3 space-y-1 cursor-pointer hover:bg-secondary/50"
            onClick={() => { setEventForm({ title: ev.title, date: ev.date, time: ev.time, location: ev.location, description: ev.description }); setEditingId(ev.id); setShowForm(true); }}>
            <p className="font-medium text-sm">{ev.title}</p>
            <p className="text-xs text-muted-foreground">{ev.time} — {ev.location}</p>
          </div>
        ))}
      </div>

      {/* Event form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} /></div>
              <div><Label>Time</Label><Input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} /></div>
            </div>
            <div><Label>Location</Label><Input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} rows={3} /></div>
            <Button variant="gold" className="w-full" onClick={handleSave}>Save Event</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Optimization modal */}
      <Dialog open={showOptModal} onOpenChange={setShowOptModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>AI Schedule Optimization</DialogTitle></DialogHeader>
          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-foreground">{optimizationResult}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
