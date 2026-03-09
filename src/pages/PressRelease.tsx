import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Sparkles, Copy, Save, Settings } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function PressRelease() {
  const [topic, setTopic] = useState("");
  const [takeaways, setTakeaways] = useState("");
  const [quotes, setQuotes] = useState("");
  const [tone, setTone] = useState("formal");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMobileForm, setShowMobileForm] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Your generated press release will appear here...</p>",
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[300px] md:min-h-[400px] p-4",
      },
    },
  });

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
      user_id: user.id,
      topic,
      tone,
      content,
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

  const FormContent = () => (
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

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] md:h-screen">
      {/* Desktop Form */}
      <div className="hidden md:block w-96 border-r border-border bg-card p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-5">Press Release</h1>
        <FormContent />
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-3 md:p-4">
          <h2 className="font-semibold text-sm md:text-base">Editor</h2>
          <div className="flex gap-2">
            {/* Mobile: Settings button to open form */}
            <Sheet open={showMobileForm} onOpenChange={setShowMobileForm}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-auto">
                <SheetHeader>
                  <SheetTitle>Press Release Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <FormContent />
                </div>
              </SheetContent>
            </Sheet>
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

        {/* Mobile: Floating generate button */}
        <div className="md:hidden p-4 border-t border-border bg-card">
          <Button variant="gold" className="w-full" onClick={() => setShowMobileForm(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Configure & Generate
          </Button>
        </div>
      </div>
    </div>
  );
}
