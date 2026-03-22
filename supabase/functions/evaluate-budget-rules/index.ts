import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!META_ACCESS_TOKEN) {
    return jsonResponse({ error: "META_ACCESS_TOKEN not configured" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch all active rules
    const { data: rules, error: rulesError } = await supabase
      .from("budget_rules")
      .select("*, clients(*)")
      .eq("is_active", true);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return jsonResponse({ message: "No active rules", processed: 0 });
    }

    const now = new Date();
    const results: any[] = [];

    for (const rule of rules) {
      // Check if it's time to evaluate this rule
      if (rule.last_checked_at) {
        const lastChecked = new Date(rule.last_checked_at);
        const diffMinutes = (now.getTime() - lastChecked.getTime()) / 60000;
        if (diffMinutes < rule.check_interval_minutes) {
          results.push({ rule_id: rule.id, status: "skipped", reason: "not yet due" });
          continue;
        }
      }

      const targetId = rule.campaign_id || rule.adset_id;
      if (!targetId) {
        results.push({ rule_id: rule.id, status: "skipped", reason: "no target" });
        continue;
      }

      try {
        // Get insights (ROAS) for the target
        const since = new Date(now);
        since.setDate(since.getDate() - rule.lookback_days);
        const sinceStr = since.toISOString().split("T")[0];
        const untilStr = now.toISOString().split("T")[0];

        const insightsUrl = `${META_API_BASE}/${targetId}/insights?fields=purchase_roas&time_range={"since":"${sinceStr}","until":"${untilStr}"}&access_token=${META_ACCESS_TOKEN}`;
        const insightsRes = await fetch(insightsUrl);
        const insightsData = await insightsRes.json();

        if (!insightsRes.ok) {
          results.push({ rule_id: rule.id, status: "error", error: insightsData });
          await supabase.from("budget_rules").update({ last_checked_at: now.toISOString() }).eq("id", rule.id);
          continue;
        }

        // Extract ROAS value
        let roas = 0;
        if (insightsData.data?.[0]?.purchase_roas?.[0]?.value) {
          roas = parseFloat(insightsData.data[0].purchase_roas[0].value);
        }

        // Update last_checked_at
        await supabase.from("budget_rules").update({ last_checked_at: now.toISOString() }).eq("id", rule.id);

        // Evaluate condition
        const conditionMet =
          rule.condition === "greater_than"
            ? roas > rule.threshold
            : roas < rule.threshold;

        if (!conditionMet) {
          results.push({ rule_id: rule.id, status: "checked", roas, triggered: false });
          continue;
        }

        // Get current budget
        const budgetUrl = `${META_API_BASE}/${targetId}?fields=daily_budget&access_token=${META_ACCESS_TOKEN}`;
        const budgetRes = await fetch(budgetUrl);
        const budgetData = await budgetRes.json();

        if (!budgetRes.ok || !budgetData.daily_budget) {
          results.push({ rule_id: rule.id, status: "error", error: "Could not fetch current budget" });
          continue;
        }

        const currentBudget = parseInt(budgetData.daily_budget); // in cents
        const multiplier = rule.action === "increase"
          ? 1 + rule.action_value / 100
          : 1 - rule.action_value / 100;
        const newBudget = Math.round(currentBudget * multiplier);

        // Update budget via Meta API
        const updateParams = new URLSearchParams({
          access_token: META_ACCESS_TOKEN,
          daily_budget: String(newBudget),
        });

        const updateRes = await fetch(`${META_API_BASE}/${targetId}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: updateParams.toString(),
        });

        const updateData = await updateRes.json();

        if (updateRes.ok) {
          await supabase
            .from("budget_rules")
            .update({ last_triggered_at: now.toISOString() })
            .eq("id", rule.id);

          results.push({
            rule_id: rule.id,
            status: "triggered",
            roas,
            old_budget: currentBudget / 100,
            new_budget: newBudget / 100,
            action: rule.action,
          });
        } else {
          results.push({ rule_id: rule.id, status: "error", error: updateData });
        }
      } catch (err: any) {
        results.push({ rule_id: rule.id, status: "error", error: err.message });
      }
    }

    return jsonResponse({ processed: results.length, results });
  } catch (error: any) {
    console.error("Rule evaluation error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
