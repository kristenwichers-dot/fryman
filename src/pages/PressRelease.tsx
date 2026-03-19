import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Copy, Save, Settings, Send, Plus, Trash2, Upload, X } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface MediaContact {
  id: string;
  name: string;
  email: string;
  outlet: string;
}

function parseCsvSimple(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
      else current += ch;
    }
    result.push(current.trim());
    return result;
  });
}

export default function PressRelease() {
  const [topic, setTopic] = useState("");
  const [takeaways, setTakeaways] = useState("");
  const [quotes, setQuotes] = useState("");
  const [tone, setTone] = useState("formal");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMobileForm, setShowMobileForm] = useState(false);

  // Media contacts
  const [contacts, setContacts] = useState<MediaContact[]>([]);
  const [contactForm, setContactForm] = useState({ name: "", email: "", outlet: "" });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // Send dialog
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const csvRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Your generated press release will appear here...</p>",
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[300px] md:min-h-[400px] p-4",
      },
    },
  });

  const fetchContacts = async () => {
    const { data } = await supabase.from("media_contacts").select("*").order("name");
    if (data) setContacts(data as MediaContact[]);
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleGenerate = async () => {
    if (!topic) { toast.error("Please enter a topic"); return; }
    setGenerating(true);
    setShowMobileForm(false);
    try {
      const { data, error } = await supabase.functions.invoke("press-release", {
        body: { topic, takeaways, quotes, tone },
      });
      if (error) throw error;
      editor?.commands.setContent(data?.content || "No content generated.");
      toast.success("Press release generated!");
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setSaving(false); return; }
    const content = editor?.getHTML() || "";
    const { error } = await supabase.from("press_releases").insert({
      user_id: user.id, topic, tone, content,
    });
    if (error) toast.error(error.message);
    else toast.success("Press release saved!");
    setSaving(false);
  };

  const handleCopy = () => {
    const text = editor?.getText() || "";
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Contact CRUD
  const handleSaveContact = async () => {
    if (!contactForm.email) { toast.error("Email is required"); return; }
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    if (editingContactId) {
      await supabase.from("media_contacts").update(contactForm).eq("id", editingContactId);
      toast.success("Contact updated");
    } else {
      await supabase.from("media_contacts").insert({ ...contactForm, user_id: user.id });
      toast.success("Contact added");
    }
    setContactForm({ name: "", email: "", outlet: "" });
    setEditingContactId(null);
    fetchContacts();
  };

  const handleDeleteContact = async (id: string) => {
    await supabase.from("media_contacts").delete().eq("id", id);
    toast.success("Contact removed");
    fetchContacts();
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsvSimple(text);
      if (rows.length < 2) { toast.error("CSV needs a header + data rows"); return; }
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      // Skip header row, expect: Name, Email, Outlet
      const toInsert = rows.slice(1).filter(r => r[1]?.includes("@")).map(r => ({
        user_id: user.id,
        name: (r[0] || "").trim(),
        email: (r[1] || "").trim(),
        outlet: (r[2] || "").trim(),
      }));
      if (toInsert.length === 0) { toast.error("No valid contacts found"); return; }
      const { error } = await supabase.from("media_contacts").insert(toInsert);
      if (error) toast.error(error.message);
      else toast.success(`Imported ${toInsert.length} contacts`);
      fetchContacts();
    };
    reader.readAsText(file);
    if (csvRef.current) csvRef.current.value = "";
  };

  // Send press release
  const handleSend = async () => {
    if (selectedContacts.length === 0) { toast.error("Select at least one contact"); return; }
    setSending(true);
    try {
      const recipients = contacts.filter(c => selectedContacts.includes(c.id));
      const { data, error } = await supabase.functions.invoke("send-press-release", {
        body: {
          to: recipients.map(c => c.email),
          subject: `Press Release: ${topic || "Campaign Update"}`,
          htmlContent: editor?.getHTML() || "",
          fromName: "Campaign Team",
        },
      });
      if (error) throw error;
      toast.success(`Sent to ${recipients.length} contacts!`);
      setShowSendDialog(false);
      setSelectedContacts([]);
    } catch (err: any) {
      toast.error(err.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const GenerateForm = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="space-y-2">
        <Label>Topic</Label>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Infrastructure Bill" />
      </div>
      <div className="space-y-2">
        <Label>Key Takeaways</Label>
        <Textarea value={takeaways} onChange={(e) => setTakeaways(e.target.value)} rows={3} placeholder="Main points..." />
      </div>
      <div className="space-y-2">
        <Label>Candidate Quotes</Label>
        <Textarea value={quotes} onChange={(e) => setQuotes(e.target.value)} rows={2} placeholder="Direct quotes..." />
      </div>
      <div className="space-y-2">
        <Label>Tone</Label>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="formal">Formal</SelectItem>
            <SelectItem value="conversational">Conversational</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="gold" className="w-full" onClick={handleGenerate} disabled={generating}>
        <Sparkles className="mr-2 h-4 w-4" />
        {generating ? "Generating..." : "Generate Press Release"}
      </Button>
    </div>
  );

  const ContactsPanel = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="John Smith" />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="john@media.com" />
      </div>
      <div className="space-y-2">
        <Label>Outlet</Label>
        <Input value={contactForm.outlet} onChange={(e) => setContactForm({ ...contactForm, outlet: e.target.value })} placeholder="Local News" />
      </div>
      <div className="flex gap-2">
        <Button variant="gold" className="flex-1" onClick={handleSaveContact}>
          <Plus className="mr-1 h-3 w-3" />{editingContactId ? "Update" : "Add"}
        </Button>
        {editingContactId && (
          <Button variant="outline" onClick={() => { setEditingContactId(null); setContactForm({ name: "", email: "", outlet: "" }); }}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input ref={csvRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvImport} />
      <Button variant="outline" className="w-full" size="sm" onClick={() => csvRef.current?.click()}>
        <Upload className="mr-1 h-3 w-3" />Import CSV (Name, Email, Outlet)
      </Button>

      <div className="space-y-2 mt-2">
        <Label className="text-muted-foreground text-xs">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</Label>
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2 text-xs">
            <div
              className="cursor-pointer flex-1 min-w-0"
              onClick={() => { setContactForm({ name: c.name, email: c.email, outlet: c.outlet }); setEditingContactId(c.id); }}
            >
              <p className="font-medium truncate">{c.name || c.email}</p>
              {c.outlet && <p className="text-muted-foreground truncate">{c.outlet}</p>}
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-1 shrink-0" onClick={() => handleDeleteContact(c.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] md:h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-96 border-r border-border bg-card p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-5">Press Release</h1>
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="generate" className="flex-1">Generate</TabsTrigger>
            <TabsTrigger value="contacts" className="flex-1">Contacts</TabsTrigger>
          </TabsList>
          <TabsContent value="generate"><GenerateForm /></TabsContent>
          <TabsContent value="contacts"><ContactsPanel /></TabsContent>
        </Tabs>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-3 md:p-4">
          <h2 className="font-semibold text-sm md:text-base">Editor</h2>
          <div className="flex gap-2">
            <Sheet open={showMobileForm} onOpenChange={setShowMobileForm}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-auto">
                <SheetHeader><SheetTitle>Press Release Settings</SheetTitle></SheetHeader>
                <div className="mt-4">
                  <Tabs defaultValue="generate" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="generate" className="flex-1">Generate</TabsTrigger>
                      <TabsTrigger value="contacts" className="flex-1">Contacts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="generate"><GenerateForm /></TabsContent>
                    <TabsContent value="contacts"><ContactsPanel /></TabsContent>
                  </Tabs>
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" onClick={() => setShowSendDialog(true)}>
              <Send className="mr-1 h-3 w-3" /><span className="hidden sm:inline">Send</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-1 h-3 w-3" /><span className="hidden sm:inline">Copy</span>
            </Button>
            <Button variant="gold" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-1 h-3 w-3" /><span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <EditorContent editor={editor} />
        </div>

        <div className="md:hidden p-4 border-t border-border bg-card">
          <Button variant="gold" className="w-full" onClick={() => setShowMobileForm(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Configure & Generate
          </Button>
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Press Release</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={`Press Release: ${topic || "Campaign Update"}`} readOnly className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Select Recipients ({selectedContacts.length} selected)</Label>
              {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet. Add them in the Contacts tab.</p>}
              <div className="max-h-48 overflow-auto space-y-1">
                {contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary/50 cursor-pointer text-sm">
                    <Checkbox checked={selectedContacts.includes(c.id)} onCheckedChange={() => toggleContact(c.id)} />
                    <span className="truncate">{c.name || c.email}</span>
                    {c.outlet && <span className="text-xs text-muted-foreground ml-auto shrink-0">{c.outlet}</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedContacts(contacts.map(c => c.id))}>Select All</Button>
              <Button variant="gold" className="flex-1" onClick={handleSend} disabled={sending}>
                <Send className="mr-1 h-3 w-3" />{sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
