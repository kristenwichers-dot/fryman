import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageCircle, Download, Eye, Save, ExternalLink, Users } from "lucide-react";

interface Voter {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  party: string;
}

export default function Texting() {
  const [name, setName] = useState("");
  const [script, setScript] = useState("Hi {{first_name}}, this is a volunteer with Cassaundra Fryman's campaign for Huron County Commissioner. We'd love your support! Can we count on your vote?");
  const [targetCity, setTargetCity] = useState("all");
  const [targetParty, setTargetParty] = useState("all");
  const [cities, setCities] = useState<string[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchVoters();
  }, [targetCity, targetParty]);

  const fetchFilters = async () => {
    const { data } = await supabase.from("voters").select("city, party");
    if (data) {
      const uniqueCities = [...new Set(data.map(v => v.city).filter(Boolean))].sort();
      const uniqueParties = [...new Set(data.map(v => v.party).filter(Boolean))].sort();
      setCities(uniqueCities);
      setParties(uniqueParties);
    }
  };

  const fetchVoters = async () => {
    let query = supabase.from("voters").select("id, first_name, last_name, phone, city, party");
    if (targetCity !== "all") query = query.eq("city", targetCity);
    if (targetParty !== "all") query = query.eq("party", targetParty);
    query = query.neq("phone", "").not("phone", "is", null);
    const { data } = await query;
    if (data) setVoters(data as Voter[]);
  };

  const previewMessage = (voter: Voter) => {
    return script.replace(/\{\{first_name\}\}/g, voter.first_name || "Friend");
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Please give your campaign a name"); return; }
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("texting_campaigns").insert({
      user_id: user.id,
      name,
      script_template: script,
      target_city: targetCity === "all" ? "" : targetCity,
      target_party: targetParty === "all" ? "" : targetParty,
      status: "draft",
    });
    if (error) toast.error(error.message);
    else toast.success("Campaign saved!");
    setSaving(false);
  };

  const handleExport = () => {
    if (voters.length === 0) { toast.error("No voters match your filters"); return; }
    const rows = [["First Name", "Last Name", "Phone"]];
    voters.forEach(v => rows.push([v.first_name, v.last_name, v.phone]));
    const csv = rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactshelper-export-${targetCity || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${voters.length} contacts`);
  };

  const sampleVoters = voters.slice(0, 3);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h1 className="text-xl md:text-2xl font-bold">P2P Texting Campaigns</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Campaign Builder */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Campaign Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Campaign Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Norwalk Unaffiliated Outreach" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>City</Label>
                  <Select value={targetCity} onValueChange={setTargetCity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Party</Label>
                  <Select value={targetParty} onValueChange={setTargetParty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Parties</SelectItem>
                      {parties.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{voters.length} voters with phone numbers match your filters</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Message Script</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{{first_name}}"}</code> to automatically insert the voter's first name.
              </p>
              <Textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                rows={4}
                placeholder="Hi {{first_name}}, this is..."
              />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="gold" className="flex-1" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Campaign"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />Export for ContactsHelper
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">How to send your texts:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Save your campaign and click "Export for ContactsHelper"</li>
              <li>Go to <a href="https://contactshelper.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">ContactsHelper.com <ExternalLink className="h-3 w-3" /></a></li>
              <li>Upload your CSV file and paste your message script</li>
              <li>Send your texts through their platform</li>
            </ol>
          </div>
        </div>

        {/* Right: Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" /> Message Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sampleVoters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No voters match your filters, or no voters have phone numbers. Try adjusting your city/party filters.
              </p>
            ) : (
              sampleVoters.map(v => (
                <div key={v.id} className="rounded-lg border border-border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    To: {v.first_name} {v.last_name} — {v.phone}
                  </p>
                  <p className="text-sm bg-primary/10 rounded-lg p-3 text-foreground">
                    {previewMessage(v)}
                  </p>
                </div>
              ))
            )}
            {voters.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                ...and {voters.length - 3} more voters
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
