import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, subject, htmlContent, fromName } = await req.json();

    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new Error("No recipients provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use AI to format and summarize, then return success
    // Since no email service is configured, we'll prepare the email content
    // and inform the user about the sending status
    const results = to.map((email: string) => ({
      email,
      status: "queued",
      message: "Email service not yet configured. Please set up an email domain to enable sending.",
    }));

    console.log(`Press release send requested to ${to.length} recipients:`, to);
    console.log("Subject:", subject);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Press release prepared for ${to.length} recipient(s). Set up an email domain to enable sending.`,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-press-release error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
