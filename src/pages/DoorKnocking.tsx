import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Download, Loader2 } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface VoterPin {
  id: string;
  last_name: string;
  first_name: string;
  street_address: string;
  city: string;
  party: string;
  notes: string;
  lat: number | null;
  lng: number | null;
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

async function geocodeAddress(street: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${street}, ${city}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "User-Agent": "CampaignApp/1.0" },
    });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export default function DoorKnocking() {
  const [voters, setVoters] = useState<VoterPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [logModal, setLogModal] = useState<VoterPin | null>(null);
  const [logNote, setLogNote] = useState("");

  const fetchVoters = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data: voterData } = await supabase
      .from("voters")
      .select("*")
      .eq("user_id", user.id)
      .order("city")
      .order("street_address");

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
            lat: v.lat,
            lng: v.lng,
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

  const handleLoadPins = async () => {
    const needGeocode = voters.filter((v) => !v.lat && v.street_address);
    if (needGeocode.length === 0) {
      toast.info("All voters already mapped");
      return;
    }
    setGeocoding(true);
    let count = 0;
    for (const v of needGeocode) {
      const result = await geocodeAddress(v.street_address, v.city);
      if (result) {
        await supabase.from("voters").update({ lat: result.lat, lng: result.lng }).eq("id", v.id);
        count++;
      }
      await new Promise((r) => setTimeout(r, 1100));
    }
    await fetchVoters();
    setGeocoding(false);
    toast.success(`Mapped ${count} of ${needGeocode.length} addresses`);
  };

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
    const header = "Stop,Last Name,First Name,Street Address,City,Party,Status,Notes\n";
    const rows = voters.map((v, i) =>
      [i + 1, v.last_name, v.first_name, `"${v.street_address}"`, v.city, v.party, v.status.replace("_", " "), `"${v.log_notes}"`].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `walk-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Walk list downloaded");
  };

  const mappable = voters.filter((v) => v.lat && v.lng);
  const unmapped = voters.filter((v) => !v.lat && v.street_address);
  const center: [number, number] = mappable.length > 0
    ? [mappable[0].lat!, mappable[0].lng!]
    : [41.1497, -82.5974]; // Huron County, Ohio

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-bold">Door Knocking</h1>
          <p className="text-xs text-muted-foreground">
            {mappable.length} pins on map • {voters.length} total voters
          </p>
        </div>
        <div className="flex gap-2">
          {unmapped.length > 0 && (
            <Button size="sm" onClick={handleLoadPins} disabled={geocoding}>
              {geocoding ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mapping {unmapped.length}...</>
              ) : (
                <><MapPin className="mr-2 h-4 w-4" />Load {unmapped.length} Pins</>
              )}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={downloadWalkList} disabled={voters.length === 0}>
            <Download className="mr-2 h-4 w-4" />Walk List
          </Button>
        </div>
      </div>

      {/* Full map */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : voters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <MapPin className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Add voters to your database first</p>
          </div>
        ) : (
          <MapContainer center={center} zoom={12} className="h-full w-full">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {mappable.map((v) => (
              <Marker key={v.id} position={[v.lat!, v.lng!]}>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>{v.last_name}, {v.first_name}</strong><br />
                    <span style={{ fontSize: 12, color: "#999" }}>{v.street_address}, {v.city}</span><br />
                    <span style={{ fontSize: 12 }}>Party: {v.party || "—"}</span><br />
                    <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => updateStatus(v, s.value)}
                          style={{
                            padding: "2px 6px",
                            fontSize: 11,
                            border: "1px solid #555",
                            borderRadius: 4,
                            background: v.status === s.value ? "#7C3AED" : "transparent",
                            color: v.status === s.value ? "#fff" : "#ccc",
                            cursor: "pointer",
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setLogModal(v); setLogNote(v.log_notes); }}
                      style={{ marginTop: 6, fontSize: 11, color: "#a78bfa", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {v.log_notes ? "✏️ Edit Note" : "📝 Add Note"}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

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
    </div>
  );
}
