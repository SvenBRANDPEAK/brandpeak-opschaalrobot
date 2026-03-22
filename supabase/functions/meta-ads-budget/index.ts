import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const META_API_BASE = 'https://graph.facebook.com/v21.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
  if (!META_ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'META_ACCESS_TOKEN is not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { action, adset_id, campaign_id, daily_budget, lifetime_budget, ad_account_id } = await req.json();

    if (action === 'list_campaigns') {
      if (!ad_account_id) {
        return new Response(
          JSON.stringify({ error: 'ad_account_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const actId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;
      const url = `${META_API_BASE}/${actId}/campaigns?fields=id,name,daily_budget,lifetime_budget,status,budget_remaining&access_token=${META_ACCESS_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Meta API error [${response.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list_adsets') {
      if (!ad_account_id) {
        return new Response(
          JSON.stringify({ error: 'ad_account_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const actId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;
      const url = `${META_API_BASE}/${actId}/adsets?fields=id,name,daily_budget,lifetime_budget,status,campaign_id&access_token=${META_ACCESS_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Meta API error [${response.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_budget') {
      const id = adset_id || campaign_id;
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'adset_id or campaign_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const params = new URLSearchParams({ access_token: META_ACCESS_TOKEN });
      if (daily_budget) params.set('daily_budget', String(Math.round(daily_budget * 100)));
      if (lifetime_budget) params.set('lifetime_budget', String(Math.round(lifetime_budget * 100)));

      const url = `${META_API_BASE}/${id}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Meta API error [${response.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: list_campaigns, list_adsets, or update_budget' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Meta Ads API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
