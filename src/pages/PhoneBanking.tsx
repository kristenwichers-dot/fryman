import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Phone, User, CheckCircle, XCircle, PhoneOff, MessageSquare, ChevronRight, Settings } from "lucide-react";

interface Voter {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  party: string | null;
  street_address: string;
  city: string;
  notes: string | null;
}

interface CallScript {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
}

const outcomes = [
  { value: "answered_positive", label: "Answered - Positive", icon: CheckCircle, color: "text-green-500" },
  { value: "answered_negative", label: "Answered - Negative", icon: XCircle, color: "text-red-500" },
  { value: "answered_undecided", label: "Answered - Undecided", icon: MessageSquare, color: "text-amber-500" },
  { value: "no_answer", label: "No Answer", icon: PhoneOff, color: "text-muted-foreground" },
  { value: "wrong_number", label: "Wrong Number", icon: Phone, color: "text-muted-foreground" },
];

export default function PhoneBanking() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [callNotes, setCallNotes] = useState("");
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [activeScript, setActiveScript] = useState<CallScript | null>(null);
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [scriptForm, setScriptForm] = useState({ name: "", content: "" });
  const [todayCalls, setTodayCalls] = useState(0);
  const [filterParty, setFilterParty] = useState("all");

  const fetchVoters = async () => {
    let query = supabase.from("voters").select("*").not("phone", "is", null).neq("phone", "").order("last_name");
    const { data } = await query;
    if (data) setVoters(data as Voter[]);
  };

  const fetchScripts = async () => {
    const { data } = await supabase.from("call_scripts").select("*").order("created_at");
    if (data) {
      setScripts(data as CallScript[]);
      const defaultScript = data.find((s: CallScript) => s.is_default) || data[0];
      if (defaultScript) setActiveScript(defaultScript);
    }
  };

  const fetchTodayCalls = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("called_at", today);
    setTodayCalls(count || 0);
  };

  useEffect(() => {
    fetchVoters();
    fetchScripts();
    fetchTodayCalls();
  }, []);

  const filteredVoters = voters.filter((v) => filterParty === "all" || v.party === filterParty);
  const currentVoter = filteredVoters[currentIndex];

  const logCall = async (outcome: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !currentVoter) return;

    const { error } = await supabase.from("call_logs").insert({
      user_id: user.id,
      voter_id: currentVoter.id,
      outcome,
      notes: callNotes,
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Call logged!");
    setCallNotes("");
    setTodayCalls((c) => c + 1);
    if (currentIndex < filteredVoters.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      toast.info("You've reached the end of the list!");
    }
  };

  const saveScript = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase.from("call_scripts").insert({
      user_id: user.id,
      name: scriptForm.name,
      content: scriptForm.content,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    toast.success("Script saved!");
    setScripts((s) => [...s, data as CallScript]);
    setScriptDialogOpen(false);
    setScriptForm({ name: "", content: "" });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Phone className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Phone Banking</h1>
        </div>
        <div className="flex gap-2">
          <Select value={filterParty} onValueChange={(v) => { setFilterParty(v); setCurrentIndex(0); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parties</SelectItem>
              <SelectItem value="Democrat">Democrat</SelectItem>
              <SelectItem value="Republican">Republican</SelectItem>
              <SelectItem value="Independent">Independent</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setScriptDialogOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{todayCalls}</div>
            <div className="text-xs text-muted-foreground">Calls Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{currentIndex + 1}</div>
            <div className="text-xs text-muted-foreground">Current</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{filteredVoters.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>

      {filteredVoters.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No voters with phone numbers found. Add phone numbers in the Voter Database.
          </CardContent>
        </Card>
      ) : currentVoter ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Voter Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Voter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xl font-bold">{currentVoter.first_name} {currentVoter.last_name}</p>
                {currentVoter.party && <p className="text-sm text-muted-foreground">{currentVoter.party}</p>}
              </div>
              <div className="flex items-center gap-2 text-lg font-mono bg-secondary px-3 py-2 rounded-lg">
                <Phone className="h-4 w-4" />
                {currentVoter.phone}
              </div>
              <p className="text-sm text-muted-foreground">{currentVoter.street_address}, {currentVoter.city}</p>
              {currentVoter.notes && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-medium text-xs text-muted-foreground mb-1">Notes:</p>
                  {currentVoter.notes}
                </div>
              )}

              {/* Call Notes */}
              <div className="pt-2">
                <Label>Call Notes</Label>
                <Textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Add notes from this call..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Outcome Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {outcomes.map((o) => (
                  <Button
                    key={o.value}
                    variant="outline"
                    className="justify-start h-auto py-2"
                    onClick={() => logCall(o.value)}
                  >
                    <o.icon className={`h-4 w-4 mr-2 ${o.color}`} />
                    <span className="text-xs">{o.label}</span>
                  </Button>
                ))}
              </div>

              {/* Skip Button */}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setCurrentIndex((i) => Math.min(i + 1, filteredVoters.length - 1))}
              >
                Skip <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Script */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Call Script
                </CardTitle>
                {scripts.length > 1 && (
                  <Select value={activeScript?.id} onValueChange={(v) => setActiveScript(scripts.find((s) => s.id === v) || null)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {scripts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activeScript ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {activeScript.content.replace(/\{name\}/g, currentVoter.first_name)}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="mb-3">No script yet. Create one to get started!</p>
                  <Button variant="outline" onClick={() => setScriptDialogOpen(true)}>Create Script</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Script Dialog */}
      <Dialog open={scriptDialogOpen} onOpenChange={setScriptDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Call Script</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Script Name</Label>
              <Input value={scriptForm.name} onChange={(e) => setScriptForm({ ...scriptForm, name: e.target.value })} placeholder="e.g., Introduction Script" />
            </div>
            <div className="space-y-1">
              <Label>Script Content</Label>
              <p className="text-xs text-muted-foreground mb-1">Use {"{name}"} to insert the voter's first name.</p>
              <Textarea
                value={scriptForm.content}
                onChange={(e) => setScriptForm({ ...scriptForm, content: e.target.value })}
                rows={8}
                placeholder={`Hi {name}, my name is [Your Name] and I'm calling on behalf of Cassaundra Fryman's campaign for County Commissioner...`}
              />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={saveScript}>Save Script</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
