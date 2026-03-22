
CREATE TABLE public.rule_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.budget_rules(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  roas NUMERIC,
  old_budget NUMERIC,
  new_budget NUMERIC,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rule_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to rule_logs" ON public.rule_logs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_rule_logs_rule_id ON public.rule_logs(rule_id);
