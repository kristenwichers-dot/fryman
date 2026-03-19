import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Save } from "lucide-react";
import { toast } from "sonner";

export default function VoterContactsCalculator() {
  const [totalVoters, setTotalVoters] = useState(20000);
  const [turnout, setTurnout] = useState(50);
  const [voteShare, setVoteShare] = useState(50);
  const [multiplier, setMultiplier] = useState(5);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data } = await supabase
        .from("campaign_settings")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (data) {
        setTotalVoters(data.total_voters);
        setTurnout(Number(data.expected_turnout));
        setVoteShare(Number(data.vote_share_needed));
        setMultiplier(data.contact_multiplier);
      }
      setLoaded(true);
    })();
  }, []);

  const expectedVoters = Math.round(totalVoters * (turnout / 100));
  const votesNeeded = Math.round(expectedVoters * (voteShare / 100));
  const contactsNeeded = votesNeeded * multiplier;

  const handleSave = async () => {
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setSaving(false); return; }

    // Upsert: delete old, insert new
    await supabase.from("campaign_settings").delete().eq("user_id", user.id);
    const { error } = await supabase.from("campaign_settings").insert({
      user_id: user.id,
      total_voters: totalVoters,
      expected_turnout: turnout,
      vote_share_needed: voteShare,
      contact_multiplier: multiplier,
    });
    if (error) toast.error(error.message);
    else toast.success("Settings saved!");
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Voter Contacts Needed to Win
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Total Registered Voters</Label>
            <Input type="number" value={totalVoters} onChange={(e) => setTotalVoters(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Expected Turnout %</Label>
            <Input type="number" value={turnout} onChange={(e) => setTurnout(Number(e.target.value))} min={1} max={100} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vote Share Needed %</Label>
            <Input type="number" value={voteShare} onChange={(e) => setVoteShare(Number(e.target.value))} min={1} max={100} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contact Multiplier</Label>
            <Input type="number" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} min={1} max={20} />
          </div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">You need approximately</p>
          <p className="text-3xl font-extrabold text-primary">{contactsNeeded.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">voter contacts to win</p>
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>{totalVoters.toLocaleString()} voters × {turnout}% turnout = <strong>{expectedVoters.toLocaleString()}</strong> expected voters</p>
          <p>{expectedVoters.toLocaleString()} × {voteShare}% vote share = <strong>{votesNeeded.toLocaleString()}</strong> votes needed</p>
          <p>{votesNeeded.toLocaleString()} × {multiplier}x contacts = <strong>{contactsNeeded.toLocaleString()}</strong> contacts</p>
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-3 w-3" />{saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
