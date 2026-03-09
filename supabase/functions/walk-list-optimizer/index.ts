import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { city, voters } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const voterList = voters
      .map((v: any, i: number) =>
        `${i}. ${v.last_name}, ${v.first_name} — ${v.street_address} — Party: ${v.party || "Unknown"} — Status: ${v.status.replace(/_/g, " ")}`
      )
      .join("\n");

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
            content: `You are a campaign field director optimizing door-knocking walk lists. Given a numbered list of voters (0-indexed), respond ONLY with a valid JSON object — no markdown fences, no extra text. The JSON must have exactly two fields:
"suggestion": a concise markdown string with the optimized walk order (use stop numbers like Stop #1, Stop #2...), key clusters by street, and strategic tips. Prioritize uncontacted voters.
"orderedIndices": a flat array of 0-based integers representing the input voter list indices in optimal walking order to minimize backtracking. Every voter index must appear exactly once.`,
          },
          {
            role: "user",
            content: `Optimize this walk list for ${city} (${voters.length} voters):\n\n${voterList || "No voters listed."}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Try to parse as JSON, stripping markdown code fences if present
    let parsedData: { suggestion: string; orderedIndices: number[] } | null = null;
    try {
      const jsonStr = rawContent.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
      parsedData = JSON.parse(jsonStr);
    } catch {
      parsedData = null;
    }

    const suggestion = parsedData?.suggestion || rawContent;
    const orderedIndices = Array.isArray(parsedData?.orderedIndices) ? parsedData.orderedIndices : null;

    return new Response(JSON.stringify({ suggestion, orderedIndices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("walk-list-optimizer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
