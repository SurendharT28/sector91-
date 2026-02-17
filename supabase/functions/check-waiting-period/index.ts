import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find investors in waiting_period for 60+ days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 60);

  const { data: investors, error: fetchError } = await supabase
    .from("investors")
    .select("id, full_name")
    .eq("status", "waiting_period")
    .not("waiting_period_start", "is", null)
    .lte("waiting_period_start", cutoffDate.toISOString());

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!investors || investors.length === 0) {
    return new Response(JSON.stringify({ message: "No investors to transition", count: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ids = investors.map((i) => i.id);

  const { error: updateError } = await supabase
    .from("investors")
    .update({ status: "inactive" })
    .in("id", ids);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log each transition
  const logs = investors.map((inv) => ({
    action: "Auto-transitioned to Inactive",
    module: "Investors",
    reference_id: inv.id,
    notes: `${inv.full_name} moved to inactive after 60 days in waiting period`,
  }));

  await supabase.from("audit_logs").insert(logs);

  return new Response(
    JSON.stringify({ message: `Transitioned ${ids.length} investors to inactive`, count: ids.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
