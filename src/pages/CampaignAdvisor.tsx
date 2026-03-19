import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, Send, FileText, Mic, DoorOpen, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickHelp = [
  { label: "Filing Requirements", icon: FileText, prompt: "What are the filing requirements and deadlines for running for County Commissioner in Ohio? Include any financial disclosure requirements." },
  { label: "Stump Speech Tips", icon: Mic, prompt: "Give me tips for writing and delivering a compelling stump speech for a County Commissioner race in rural Ohio. Include a sample outline." },
  { label: "Door Knocking Etiquette", icon: DoorOpen, prompt: "What are the best practices and etiquette for door-to-door canvassing in a local Ohio election? Include what to say, what to avoid, and safety tips." },
];

export default function CampaignAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("campaign-assistant", {
        body: { messages: newMessages.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) toast.error("Too many requests — please wait a moment.");
        else toast.error(data.error);
        setLoading(false);
        return;
      }
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch (e: any) {
      toast.error("Failed to get response");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-3">
        <GraduationCap className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">Campaign Advisor</h1>
          <p className="text-xs text-muted-foreground">Expert guidance for your Huron County Commissioner race</p>
        </div>
      </div>

      {/* Quick Help */}
      {messages.length === 0 && (
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Get quick advice on common topics:</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {quickHelp.map(q => (
              <Button
                key={q.label}
                variant="outline"
                className="h-auto py-3 px-4 flex flex-col items-start gap-1 text-left"
                onClick={() => sendMessage(q.prompt)}
              >
                <div className="flex items-center gap-2">
                  <q.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{q.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about strategy, compliance, fundraising..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" variant="gold" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
