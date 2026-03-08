import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Download, Loader2, CheckCircle2, Clock, Ban } from "lucide-react";

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
  { value: "not_visited", label: "Not Visited", color: "text-muted-foreground" },
  { value: "contacted", label: "Contacted", color: "text-emerald-400" },
  { value: "not_home", label: "Not Home", color: "text-amber-400" },
  { value: "refused", label: "Refused", color: "text-destructive" },
];

// Simple geocode using Nominatim (free, no key needed)
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
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [showMap, setShowMap] = useState(false);
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
  };

  useEffect(() => { fetchVoters(); }, []);

  const handleShowMap = async () => {
    // Geocode any voters missing lat/lng
    const needGeocode = voters.filter((v) => !v.lat && v.street_address);
    if (needGeocode.length > 0) {
      setGeocoding(true);
      for (const v of needGeocode) {
        const result = await geocodeAddress(v.street_address, v.city);
        if (result) {
          await supabase.from("voters").update({ lat: result.lat, lng: result.lng }).eq("id", v.id);
        }
        // Small delay to respect Nominatim rate limit
        await new Promise((r) => setTimeout(r, 1100));
      }
      await fetchVoters();
      setGeocoding(false);
    }
    setShowMap(true);
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
    const rows = filtered.map((v, i) =>
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

  const cities = [...new Set(voters.map((r) => r.city).filter(Boolean))];

  const filtered = voters.filter((r) => {
    const text = `${r.last_name} ${r.first_name} ${r.street_address} ${r.city}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const matchCity = filterCity === "all" || r.city === filterCity;
    return matchSearch && matchCity;
  });

  const mappable = filtered.filter((v) => v.lat && v.lng);
  const center: [number, number] = mappable.length > 0
    ? [mappable[0].lat!, mappable[0].lng!]
    : [39.8283, -98.5795]; // US center fallback

  const stats = {
    total: filtered.length,
    visited: filtered.filter((r) => r.status !== "not_visited").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Door Knocking</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} voters • {stats.visited} visited
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleShowMap}
            disabled={geocoding || voters.length === 0}
          >
            {geocoding ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mapping...</>
            ) : (
              <><MapPin className="mr-2 h-4 w-4" />{showMap ? "Refresh Map" : "Show on Map"}</>
            )}
          </Button>
          <Button variant="outline" onClick={downloadWalkList} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" />Download Walk List
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search voters..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Map */}
      {showMap && (
        <div className="rounded-xl border border-border overflow-hidden" style={{ height: 400 }}>
          <MapContainer center={center} zoom={12} className="h-full w-full" style={{ background: "hsl(var(--background))" }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {mappable.map((v) => (
              <Marker key={v.id} position={[v.lat!, v.lng!]}>
                <Popup>
                  <strong>{v.last_name}, {v.first_name}</strong><br />
                  {v.street_address}, {v.city}<br />
                  <em>{v.status.replace("_", " ")}</em>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Voter list */}
      {voters.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No voters in your database yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v, i) => {
            const statusInfo = STATUS_OPTIONS.find((s) => s.value === v.status) || STATUS_OPTIONS[0];
            return (
              <div key={v.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 hover:bg-secondary/30 transition-colors">
                <span className="text-xs font-mono text-muted-foreground w-6 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{v.last_name}, {v.first_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{v.street_address}, {v.city}</p>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{v.party}</span>
                <Select value={v.status} onValueChange={(val) => updateStatus(v, val)}>
                  <SelectTrigger className="h-7 text-xs w-32">
                    <span className={statusInfo.color}><SelectValue /></span>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setLogModal(v); setLogNote(v.log_notes); }}>
                  {v.log_notes ? "Edit Note" : "Add Note"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

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
