import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Sparkles, ChevronLeft, ChevronRight, Calendar, Trash2, Paperclip, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface CampaignEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  end_time: string;
  location: string;
  description: string;
}

interface EventAttachment {
  id: string;
  event_id: string;
  file_name: string;
  file_path: string;
}

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatTimeDisplay(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function timeToHour(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

const PLANNER_START = 6;
const PLANNER_END = 22;

export default function EventsScheduler() {
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventForm, setEventForm] = useState({ title: "", date: "", time: "", end_time: "", location: "", description: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState("");
  const [showOptModal, setShowOptModal] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("date");
    if (data) setEvents(data.map((e: any) => ({ ...e, end_time: e.end_time || "" })) as CampaignEvent[]);
  };

  const fetchAttachments = async (eventId: string) => {
    const { data } = await supabase.from("event_attachments").select("*").eq("event_id", eventId);
    if (data) setAttachments(data as EventAttachment[]);
    else setAttachments([]);
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
    setEventForm({ title: "", date: "", time: "", end_time: "", location: "", description: "" });
    setEditingId(null);
    setAttachments([]);
    fetchEvents();
  };

  const handleDelete = async () => {
    if (!editingId) return;
    // Delete attachments from storage
    for (const att of attachments) {
      await supabase.storage.from("event-attachments").remove([att.file_path]);
    }
    await supabase.from("events").delete().eq("id", editingId);
    toast.success("Event deleted");
    setShowForm(false);
    setEditingId(null);
    setAttachments([]);
    fetchEvents();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingId) { toast.error("Save the event first before uploading files"); return; }
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const filePath = `${user.id}/${editingId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("event-attachments").upload(filePath, file);
      if (uploadErr) { toast.error(`Upload failed: ${uploadErr.message}`); continue; }
      await supabase.from("event_attachments").insert({
        event_id: editingId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
      });
    }
    setUploading(false);
    toast.success("Files uploaded");
    fetchAttachments(editingId);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownload = async (att: EventAttachment) => {
    const { data } = await supabase.storage.from("event-attachments").createSignedUrl(att.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleOptimize = async () => {
    if (!selectedDate) { toast.error("Select a date first"); return; }
    setOptimizing(true);
    try {
      const dayEvts = events.filter((e) => isSameDay(parseDateLocal(e.date), selectedDate!));
      const { data, error } = await supabase.functions.invoke("schedule-optimizer", {
        body: { events: dayEvts, date: format(selectedDate, "yyyy-MM-dd") },
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

  const dayEvents = (day: Date) => events.filter((e) => isSameDay(parseDateLocal(e.date), day));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    if (window.innerWidth < 768) setShowSidePanel(true);
  };

  const openNewEvent = (prefilledTime?: string) => {
    setEventForm({
      title: "",
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
      time: prefilledTime || "",
      end_time: "",
      location: "",
      description: "",
    });
    setEditingId(null);
    setAttachments([]);
    setShowForm(true);
  };

  const openEditEvent = (ev: CampaignEvent) => {
    setEventForm({ title: ev.title, date: ev.date, time: ev.time, end_time: ev.end_time, location: ev.location, description: ev.description });
    setEditingId(ev.id);
    fetchAttachments(ev.id);
    setShowForm(true);
  };

  // Daily planner timeline
  const PlannerTimeline = ({ evts }: { evts: CampaignEvent[] }) => {
    const hours = Array.from({ length: PLANNER_END - PLANNER_START }, (_, i) => PLANNER_START + i);
    return (
      <div className="relative mt-3">
        {hours.map((h) => (
          <div
            key={h}
            className="flex items-start border-t border-border/50 h-12 cursor-pointer hover:bg-secondary/30 transition-colors"
            onClick={() => openNewEvent(`${h.toString().padStart(2, "0")}:00`)}
          >
            <span className="text-[10px] text-muted-foreground w-12 shrink-0 pt-0.5">{formatTimeDisplay(`${h}:00`)}</span>
            <div className="flex-1 relative" />
          </div>
        ))}
        {/* Event blocks */}
        {evts.filter(e => e.time).map((ev) => {
          const startH = timeToHour(ev.time);
          const endH = ev.end_time ? timeToHour(ev.end_time) : startH + 1;
          const top = (startH - PLANNER_START) * 48;
          const height = Math.max((endH - startH) * 48, 24);
          if (startH < PLANNER_START || startH >= PLANNER_END) return null;
          return (
            <div
              key={ev.id}
              className="absolute left-12 right-1 rounded bg-primary/20 border border-primary/30 px-2 py-1 text-xs cursor-pointer hover:bg-primary/30 transition-colors overflow-hidden"
              style={{ top: `${top}px`, height: `${height}px` }}
              onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
            >
              <p className="font-medium truncate text-primary">{ev.title}</p>
              <p className="text-muted-foreground truncate">{formatTimeDisplay(ev.time)}{ev.end_time ? ` – ${formatTimeDisplay(ev.end_time)}` : ""}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const SidePanelContent = () => {
    const selDayEvents = selectedDate ? dayEvents(selectedDate) : [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a day"}
          </h3>
          <Button size="sm" variant="gold" onClick={() => openNewEvent()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {selectedDate && selDayEvents.length === 0 && (
          <p className="text-sm text-muted-foreground">No events scheduled</p>
        )}
        {selectedDate && <PlannerTimeline evts={selDayEvents} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] md:h-screen">
      {/* Calendar */}
      <div className="flex-1 p-4 md:p-6 space-y-4 overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold">Events & AI Scheduler</h1>
          <Button variant="gold" size="sm" onClick={handleOptimize} disabled={optimizing}>
            <Sparkles className="mr-2 h-4 w-4" />
            {optimizing ? "Optimizing..." : "Optimize"}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-px rounded-xl border border-border overflow-hidden bg-border">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="bg-secondary p-1 md:p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-card p-1 md:p-2 min-h-[50px] md:min-h-[80px]" />
          ))}
          {days.map((day) => {
            const de = dayEvents(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`bg-card p-1 md:p-2 min-h-[50px] md:min-h-[80px] cursor-pointer transition-colors hover:bg-secondary/50 ${
                  isSelected ? "ring-2 ring-primary ring-inset" : ""
                } ${!isSameMonth(day, currentMonth) ? "opacity-40" : ""}`}
              >
                <p className="text-xs font-medium">{format(day, "d")}</p>
                <div className="hidden md:block">
                  {de.slice(0, 2).map((ev) => (
                    <div key={ev.id} className="mt-1 truncate rounded bg-primary/20 px-1 py-0.5 text-[10px] text-primary cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}>
                      {ev.title}
                    </div>
                  ))}
                  {de.length > 2 && <p className="text-[10px] text-muted-foreground">+{de.length - 2} more</p>}
                </div>
                {de.length > 0 && (
                  <div className="md:hidden flex justify-center mt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop Side panel */}
      <div className="hidden md:block w-80 border-l border-border bg-card p-6 overflow-auto">
        <SidePanelContent />
      </div>

      {/* Mobile Side panel */}
      <Sheet open={showSidePanel} onOpenChange={setShowSidePanel}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Events"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <SidePanelContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Event form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} /></div>
              <div><Label>Start Time</Label><Input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="time" value={eventForm.end_time} onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })} /></div>
            </div>
            <div><Label>Location</Label><Input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} rows={3} /></div>

            {/* Attachments */}
            {editingId && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> Attachments</Label>
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-1.5 text-xs">
                    <span className="truncate">{att.file_name}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => handleDownload(att)}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Paperclip className="mr-1 h-3 w-3" />{uploading ? "Uploading..." : "Add Files"}
                </Button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {editingId && (
                <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                  <Trash2 className="mr-1 h-4 w-4" />Delete
                </Button>
              )}
              <Button variant="gold" className={editingId ? "flex-1" : "w-full"} onClick={handleSave}>Save Event</Button>
            </div>
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
