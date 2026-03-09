import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Settings, Trash2, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface PersonaSettings {
  opponentName: string;
  politicalLeaning: string;
  aggressiveness: string;
  policyPositions: string;
}

const defaultPersona: PersonaSettings = {
  opponentName: "Political Opponent",
  politicalLeaning: "moderate",
  aggressiveness: "medium",
  policyPositions: "",
};

export default function DebatePrep() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [persona, setPersona] = useState<PersonaSettings>(defaultPersona);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase
      .from("chat_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");
    if (data) {
      setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
    }
  };

  useEffect(() => { fetchHistory(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleClear = async () => {
    setClearing(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("chat_history").delete().eq("user_id", user.id);
      if (error) throw error;
      setMessages([]);
      setShowClearConfirm(false);
      toast.success("Debate session cleared — ready for a new one!");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear session");
    } finally {
      setClearing(false);
    }
  };

  const handleSave = () => {
    if (messages.length === 0) {
      toast.error("No messages to save.");
      return;
    }
    const lines = messages.map((m) =>
      `[${m.role === "user" ? "You" : persona.opponentName}]\n${m.content}`
    );
    const text = `Debate Prep Session\nOpponent: ${persona.opponentName} (${persona.politicalLeaning})\n\n${lines.join("\n\n---\n\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debate-session-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Session saved as text file!");
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not logged in");

      // Save user message
      await supabase.from("chat_history").insert({ user_id: user.id, role: "user", content: input });

      const allMsgs = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("debate-bot", {
        body: { messages: allMsgs, persona },
      });
      if (error) throw error;

      const assistantMsg: Message = { role: "assistant", content: data?.content || "No response" };
      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant message
      await supabase.from("chat_history").insert({ user_id: user.id, role: "assistant", content: assistantMsg.content });
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h1 className="text-lg font-bold">Debate Prep Bot</h1>
          <p className="text-xs text-muted-foreground">Opponent: {persona.opponentName}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleSave} title="Save session">
            <Download className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowClearConfirm(true)} title="New debate" className="text-destructive hover:text-destructive">
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">Start a debate practice session. Configure your opponent in settings.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-secondary-foreground rounded-bl-md"
              }`}
            >
              <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your argument or question..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <Button variant="gold" size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle>Opponent Persona Settings</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Opponent Name</Label><Input value={persona.opponentName} onChange={(e) => setPersona({ ...persona, opponentName: e.target.value })} /></div>
            <div><Label>Political Leaning</Label>
              <Select value={persona.politicalLeaning} onValueChange={(v) => setPersona({ ...persona, politicalLeaning: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="far-left">Far Left</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="far-right">Far Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Aggressiveness</Label>
              <Select value={persona.aggressiveness} onValueChange={(v) => setPersona({ ...persona, aggressiveness: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Key Policy Positions</Label><Textarea value={persona.policyPositions} onChange={(e) => setPersona({ ...persona, policyPositions: e.target.value })} rows={3} placeholder="Healthcare, immigration, economy..." /></div>
            <Button variant="gold" className="w-full" onClick={() => setShowSettings(false)}>Save Settings</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Confirm */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a New Debate?</DialogTitle>
            <DialogDescription>This will permanently delete the current conversation. Save it first using the download button if you want to keep it.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleClear} disabled={clearing}>
              {clearing ? "Clearing..." : "Clear & Start New"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
