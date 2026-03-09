import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, takeaways, quotes, tone } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional political press release writer. Write in a ${tone} tone. Output well-formatted HTML suitable for a rich text editor. Use <h1>, <h2>, <p>, <strong>, <em>, <ul>, <li> tags.

Structure the press release as follows:
1. Headline (H1)
2. Dateline: always use "Huron County, Ohio" as the location
3. Concise body paragraphs (keep the entire release brief and to the point — no fluff)
4. End with a "###" separator and a boilerplate contact block in this exact format:
<p><strong>FOR IMMEDIATE RELEASE</strong></p>
<p><strong>Contact:</strong> Cassaundra Fryman<br><strong>Email:</strong> cassfryman@gmail.com<br><strong>Phone:</strong> 567-224-2480</p>

Never include a website URL. Always use "Huron County, Ohio" as the dateline location. Keep the press release concise.`,
          },
          {
            role: "user",
            content: `Write a press release about: ${topic}\n\nKey Takeaways:\n${takeaways}\n\nCandidate Quotes:\n${quotes}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "<p>No content generated.</p>";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("press-release error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
