import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calculator, Save, Sparkles, Target, Users, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function VoterContactsCalculator() {
  const [totalVoters, setTotalVoters] = useState(28000);
  const [turnout, setTurnout] = useState(35);
  const [voteShare, setVoteShare] = useState(51);
  const [multiplier, setMultiplier] = useState(5);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [contactsMade, setContactsMade] = useState(0);
  const [doorsKnocked, setDoorsKnocked] = useState(0);
  const [callsMade, setCallsMade] = useState(0);
  const [aiInsight, setAiInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const [settingsRes, doorsRes, callsRes] = await Promise.all([
        supabase.from("campaign_settings").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("door_knocking_logs").select("id", { count: "exact" }).eq("user_id", user.id).neq("status", "not_visited"),
        supabase.from("call_logs").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);

      if (settingsRes.data) {
        setTotalVoters(settingsRes.data.total_voters);
        setTurnout(Number(settingsRes.data.expected_turnout));
        setVoteShare(Number(settingsRes.data.vote_share_needed));
        setMultiplier(settingsRes.data.contact_multiplier);
      }

      const doors = doorsRes.count || 0;
      const calls = callsRes.count || 0;
      setDoorsKnocked(doors);
      setCallsMade(calls);
      setContactsMade(doors + calls);
      setLoaded(true);
    })();
  }, []);

  const expectedVoters = Math.round(totalVoters * (turnout / 100));
  const votesNeeded = Math.round(expectedVoters * (voteShare / 100));
  const contactsNeeded = votesNeeded * multiplier;
  const progressPct = contactsNeeded > 0 ? Math.min(100, Math.round((contactsMade / contactsNeeded) * 100)) : 0;

  const handleSave = async () => {
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setSaving(false); return; }
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

  const fetchAiInsight = async () => {
    setLoadingInsight(true);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-assistant", {
        body: {
          messages: [{
            role: "user",
            content: `I'm running for Huron County Commissioner. Here are my voter contact stats:
- Target contacts needed: ${contactsNeeded.toLocaleString()}
- Contacts made so far: ${contactsMade.toLocaleString()} (${doorsKnocked} doors knocked, ${callsMade} phone calls)
- Progress: ${progressPct}%
- District has ${totalVoters.toLocaleString()} registered voters, expecting ${turnout}% turnout
- Need ${voteShare}% vote share to win

Give me 2-3 brief, specific, actionable insights about my voter contact progress and strategy. Be concise — 3-4 sentences max.`
          }],
        },
      });
      if (error) throw error;
      setAiInsight(data?.content || "Unable to generate insights.");
    } catch (err: any) {
      toast.error("Could not load AI insights");
    } finally {
      setLoadingInsight(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Voter Contact Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Primary Result */}
        <div className="rounded-xl bg-primary/10 p-5 text-center space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Contacts Needed to Win</p>
          <p className="text-4xl font-extrabold text-primary">{contactsNeeded.toLocaleString()}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{contactsMade.toLocaleString()} made</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <MapPin className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{doorsKnocked.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Doors Knocked</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <Phone className="h-4 w-4 text-pink-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{callsMade.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Calls Made</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <Users className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{(contactsNeeded - contactsMade).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Remaining</p>
          </div>
        </div>

        {/* Derived Stats */}
        <div className="text-xs text-muted-foreground space-y-0.5 bg-secondary/30 rounded-lg p-3">
          <p>{totalVoters.toLocaleString()} registered voters × {turnout}% turnout = <strong>{expectedVoters.toLocaleString()}</strong> expected voters</p>
          <p>{expectedVoters.toLocaleString()} × {voteShare}% vote share = <strong>{votesNeeded.toLocaleString()}</strong> votes needed</p>
          <p>{votesNeeded.toLocaleString()} × {multiplier}x multiplier = <strong>{contactsNeeded.toLocaleString()}</strong> contacts</p>
        </div>

        {/* AI Insights */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={fetchAiInsight}
            disabled={loadingInsight}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {loadingInsight ? "Analyzing..." : "Get AI Strategy Insights"}
          </Button>
          {aiInsight && (
            <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 text-sm prose prose-sm max-w-none">
              <ReactMarkdown>{aiInsight}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Adjust Assumptions (Collapsed) */}
        <Accordion type="single" collapsible>
          <AccordionItem value="assumptions" className="border-none">
            <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
              <span className="flex items-center gap-1"><Calculator className="h-3 w-3" /> Adjust Assumptions</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Registered Voters</Label>
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
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-3 w-3" />{saving ? "Saving..." : "Save Settings"}
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
