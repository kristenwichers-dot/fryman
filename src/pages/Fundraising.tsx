import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Users, Plus, Copy, ExternalLink } from "lucide-react";

interface Donation {
  id: string;
  donor_name: string;
  donor_email: string;
  amount: number;
  frequency: string;
  status: string;
  created_at: string;
}

export default function Fundraising() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ donor_name: "", donor_email: "", amount: "" });
  const [saving, setSaving] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "kggminzhorvnbkvkfssc";
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/anedot-webhook`;

  const fetchDonations = async () => {
    const { data } = await supabase.from("donations").select("*").order("created_at", { ascending: false });
    if (data) setDonations(data as Donation[]);
    setLoading(false);
  };

  useEffect(() => { fetchDonations(); }, []);

  const totalRaised = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const donorCount = new Set(donations.filter(d => d.donor_email).map(d => d.donor_email)).size;
  const avgDonation = donations.length > 0 ? totalRaised / donations.length : 0;

  const handleManualAdd = async () => {
    if (!manualForm.donor_name || !manualForm.amount) { toast.error("Name and amount required"); return; }
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("donations").insert({
      user_id: user.id,
      donor_name: manualForm.donor_name,
      donor_email: manualForm.donor_email,
      amount: parseFloat(manualForm.amount),
      frequency: "one_time",
      status: "completed",
    });
    if (error) toast.error(error.message);
    else {
      const amount = parseFloat(manualForm.amount);
      // Automation: flag high-value donors
      if (amount > 100) {
        await (supabase.from as any)("automation_logs").insert({
          user_id: user.id,
          automation_type: "high_value_donor",
          description: `High-value donation: $${amount} from ${manualForm.donor_name}`,
          metadata: { amount, donor_name: manualForm.donor_name },
        });
        await supabase.from("chat_history").insert({
          user_id: user.id,
          role: "assistant",
          content: `📞 Action needed: Call ${manualForm.donor_name} to thank them for their $${amount} donation!`,
        });
        toast.success(`Donation added! Don't forget to call ${manualForm.donor_name} to say thank you.`);
      } else {
        toast.success("Donation added!");
      }
      setManualForm({ donor_name: "", donor_email: "", amount: "" });
      setShowManual(false);
      fetchDonations();
    }
    setSaving(false);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied!");
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Fundraising</h1>
        <Button variant="gold" onClick={() => setShowManual(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Donation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Total Raised
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">${totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" /> Unique Donors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{donorCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Avg Donation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${avgDonation.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Anedot Setup */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Connect Anedot (Auto-Track Donations)
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Follow these steps to automatically import donations from your Anedot account.
          </p>
        </CardHeader>
        <CardContent className="space-y-0">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step1">
              <AccordionTrigger className="text-sm py-3">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">1</span>
                  Log in to your Anedot account
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pl-8">
                Go to <strong>anedot.com</strong> and sign in with your campaign's account credentials.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="step2">
              <AccordionTrigger className="text-sm py-3">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">2</span>
                  Go to Settings → Webhooks
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pl-8">
                In your Anedot dashboard, click <strong>Settings</strong> in the left menu, then find the <strong>Webhooks</strong> section.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="step3">
              <AccordionTrigger className="text-sm py-3">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">3</span>
                  Add this webhook URL
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pl-8 space-y-3">
                <p>Click <strong>"Add Webhook"</strong> and paste the URL below:</p>
                <div className="flex items-center gap-2">
                  <Input value={webhookUrl} readOnly className="text-xs font-mono" />
                  <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="step4" className="border-b-0">
              <AccordionTrigger className="text-sm py-3">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">4</span>
                  Save & you're done!
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pl-8">
                Click <strong>Save</strong> in Anedot. From now on, every donation will automatically appear on this page. You can make a small test donation to verify the connection works.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Donations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : donations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No donations yet. Add one manually or connect Anedot.</p>
          ) : (
            <div className="space-y-2">
              {donations.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{d.donor_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()} · {d.frequency === "one_time" ? "One-time" : d.frequency}
                    </p>
                  </div>
                  <p className="font-bold text-primary">${Number(d.amount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Add Dialog */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Donation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Donor Name</Label>
              <Input value={manualForm.donor_name} onChange={(e) => setManualForm({ ...manualForm, donor_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email (optional)</Label>
              <Input type="email" value={manualForm.donor_email} onChange={(e) => setManualForm({ ...manualForm, donor_email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" value={manualForm.amount} onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })} />
            </div>
            <Button variant="gold" className="w-full" onClick={handleManualAdd} disabled={saving}>
              {saving ? "Adding..." : "Add Donation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
