import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { headers, sampleRows } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are a data mapping assistant. I have a CSV with these column headers:
${JSON.stringify(headers)}

Here are the first few sample rows:
${sampleRows.map((r: string[], i: number) => `Row ${i + 1}: ${JSON.stringify(r)}`).join("\n")}

I need to map these columns into the following voter database fields:
- name (full name of the voter — combine first/last name columns if needed)
- address (full address — combine street/city/state/zip columns if needed)
- party (political party affiliation)
- notes (any other useful info that doesn't fit above — can combine multiple columns)

For each field, tell me which CSV column index(es) to use (0-based) and how to combine them.
If a field has no matching column, return null.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a precise data mapping assistant. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "map_csv_columns",
              description: "Return the mapping from CSV columns to voter database fields",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "object",
                    properties: {
                      columnIndices: { type: "array", items: { type: "integer" }, description: "0-based indices of columns to combine for this field" },
                      separator: { type: "string", description: "String to join multiple columns with, e.g. ' ' or ', '" },
                    },
                    required: ["columnIndices", "separator"],
                    additionalProperties: false,
                  },
                  address: {
                    type: "object",
                    properties: {
                      columnIndices: { type: "array", items: { type: "integer" } },
                      separator: { type: "string" },
                    },
                    required: ["columnIndices", "separator"],
                    additionalProperties: false,
                  },
                  party: {
                    type: "object",
                    properties: {
                      columnIndices: { type: "array", items: { type: "integer" } },
                      separator: { type: "string" },
                    },
                    required: ["columnIndices", "separator"],
                    additionalProperties: false,
                  },
                  notes: {
                    type: "object",
                    properties: {
                      columnIndices: { type: "array", items: { type: "integer" } },
                      separator: { type: "string" },
                    },
                    required: ["columnIndices", "separator"],
                    additionalProperties: false,
                  },
                },
                required: ["name", "address", "party", "notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "map_csv_columns" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + t);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned from AI");

    const mapping = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ mapping }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("csv-mapper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
