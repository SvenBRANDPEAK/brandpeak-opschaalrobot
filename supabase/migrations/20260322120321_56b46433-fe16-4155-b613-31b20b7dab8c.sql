
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ad_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budget_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  campaign_id TEXT,
  adset_id TEXT,
  target_type TEXT NOT NULL DEFAULT 'campaign',
  target_name TEXT,
  metric TEXT NOT NULL DEFAULT 'roas',
  condition TEXT NOT NULL DEFAULT 'greater_than',
  threshold NUMERIC NOT NULL,
  lookback_days INTEGER NOT NULL DEFAULT 7,
  action TEXT NOT NULL DEFAULT 'increase',
  action_value NUMERIC NOT NULL DEFAULT 10,
  check_interval_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to budget_rules" ON public.budget_rules FOR ALL USING (true) WITH CHECK (true);
