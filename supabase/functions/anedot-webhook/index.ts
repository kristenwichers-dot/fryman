import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    console.log("Anedot webhook received:", JSON.stringify(payload));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Anedot webhook payload structure
    const donorName = payload.person?.first_name && payload.person?.last_name
      ? `${payload.person.first_name} ${payload.person.last_name}`
      : payload.person?.name || payload.donor_name || "Anonymous";
    const donorEmail = payload.person?.email || payload.donor_email || "";
    const amount = parseFloat(payload.amount || payload.total_amount || "0");
    const frequency = payload.frequency || payload.recurring_frequency || "one_time";
    const status = payload.status || payload.action_type || "completed";
    const anedotId = payload.uid || payload.donation_id || payload.id || "";

    // We need a user_id to associate this donation. 
    // Use a webhook secret to identify the campaign owner, or look up by a configured user.
    // For simplicity, we'll look for the first user with campaign_settings as the campaign owner.
    const { data: settings } = await supabase
      .from("campaign_settings")
      .select("user_id")
      .limit(1)
      .maybeSingle();

    const userId = settings?.user_id;
    if (!userId) {
      console.error("No campaign owner found. Set up campaign settings first.");
      return new Response(JSON.stringify({ error: "No campaign owner configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.from("donations").insert({
      user_id: userId,
      donor_name: donorName,
      donor_email: donorEmail,
      amount,
      frequency,
      status,
      anedot_donation_id: anedotId,
      raw_payload: payload,
    });

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("anedot-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
