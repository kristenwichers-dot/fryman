import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface DoorKnockEntry {
  id: string;
  voter_id: string;
  voter_name: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  notes: string;
}

export default function DoorKnocking() {
  const [entries, setEntries] = useState<DoorKnockEntry[]>([]);
  const [logModal, setLogModal] = useState<DoorKnockEntry | null>(null);
  const [logNote, setLogNote] = useState("");

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("door_knocking_logs")
      .select("*, voters(name, address)")
      .order("created_at");
    if (data) {
      setEntries(
        data.map((d: any) => ({
          id: d.id,
          voter_id: d.voter_id,
          voter_name: d.voters?.name || "Unknown",
          address: d.voters?.address || "",
          lat: d.lat || 40.7128,
          lng: d.lng || -74.006,
          status: d.status || "not_visited",
          notes: d.notes || "",
        }))
      );
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("door_knocking_logs").update({ status }).eq("id", id);
    fetchEntries();
  };

  const saveLog = async () => {
    if (!logModal) return;
    await supabase.from("door_knocking_logs").update({ notes: logNote }).eq("id", logModal.id);
    toast.success("Interaction logged");
    setLogModal(null);
    setLogNote("");
    fetchEntries();
  };

  const positions: [number, number][] = entries.map((e) => [e.lat, e.lng]);
  const center: [number, number] = positions.length > 0 ? positions[0] : [40.7128, -74.006];

  const statusColors: Record<string, string> = {
    not_visited: "text-muted-foreground",
    contacted: "text-emerald-400",
    not_home: "text-gold",
    refused: "text-destructive",
  };

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Map */}
      <div className="flex-1">
        <MapContainer center={center} zoom={13} className="h-full w-full" style={{ background: "hsl(0 0% 4%)" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {entries.map((e) => (
            <Marker key={e.id} position={[e.lat, e.lng]}>
              <Popup>{e.voter_name}<br />{e.address}</Popup>
            </Marker>
          ))}
          {positions.length > 1 && (
            <Polyline positions={positions} pathOptions={{ color: "#7C3AED", weight: 3, dashArray: "8 4" }} />
          )}
        </MapContainer>
      </div>

      {/* List */}
      <div className="w-96 border-l border-border bg-card overflow-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold">Route List</h2>
          <p className="text-sm text-muted-foreground">{entries.length} addresses</p>
        </div>
        <div className="divide-y divide-border">
          {entries.map((e) => (
            <div key={e.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{e.voter_name}</p>
                  <p className="text-xs text-muted-foreground">{e.address}</p>
                </div>
                <span className={`text-xs font-medium ${statusColors[e.status]}`}>
                  {e.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex gap-2">
                <Select value={e.status} onValueChange={(v) => updateStatus(e.id, v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_visited">Not Visited</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="not_home">Not Home</SelectItem>
                    <SelectItem value="refused">Refused</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => { setLogModal(e); setLogNote(e.notes); }}>
                  Log
                </Button>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No door-knocking entries yet. Add voters with addresses first.
            </p>
          )}
        </div>
      </div>

      <Dialog open={!!logModal} onOpenChange={(o) => !o && setLogModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Interaction — {logModal?.voter_name}</DialogTitle></DialogHeader>
          <Textarea value={logNote} onChange={(e) => setLogNote(e.target.value)} rows={4} placeholder="Notes from this visit..." />
          <Button variant="gold" onClick={saveLog}>Save Note</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
