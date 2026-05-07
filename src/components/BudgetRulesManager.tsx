import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Zap, Clock, TrendingUp, Search, Copy, Pencil } from "lucide-react";
import type { Client } from "./ClientManager";
import { RuleLogViewer } from "./RuleLogViewer";

type BudgetRule = {
  id: string;
  client_id: string;
  name: string;
  campaign_id: string | null;
  adset_id: string | null;
  target_type: string;
  target_name: string | null;
  metric: string;
  condition: string;
  threshold: number;
  lookback_days: number;
  action: string;
  action_value: number;
  check_interval_minutes: number;
  max_daily_budget: number | null;
  is_active: boolean;
  last_checked_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
};

type CampaignOption = { id: string; name: string };

type Props = {
  client: Client;
};

export function BudgetRulesManager({ client }: Props) {
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [adsets, setAdsets] = useState<CampaignOption[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    target_type: "campaign" as "campaign" | "adset",
    target_id: "",
    condition: "greater_than",
    threshold: "",
    lookback_days: "7",
    action: "increase",
    action_value: "10",
    check_interval_days: "1",
    max_daily_budget: "",
  });

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from("budget_rules")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to fetch rules");
    setRules(data || []);
    setLoading(false);
  };

  const fetchTargets = async () => {
    setLoadingTargets(true);
    try {
      const actId = client.ad_account_id.startsWith("act_")
        ? client.ad_account_id
        : `act_${client.ad_account_id}`;

      const [campRes, adsetRes] = await Promise.all([
        supabase.functions.invoke("meta-ads-budget", {
          body: { action: "list_campaigns", ad_account_id: actId },
        }),
        supabase.functions.invoke("meta-ads-budget", {
          body: { action: "list_adsets", ad_account_id: actId },
        }),
      ]);

      if (campRes.data?.data) {
        setCampaigns(campRes.data.data.map((c: any) => ({ id: c.id, name: c.name })));
      }
      if (adsetRes.data?.data) {
        setAdsets(adsetRes.data.data.map((a: any) => ({ id: a.id, name: a.name })));
      }
    } catch {
      toast.error("Failed to fetch campaigns/ad sets from Meta");
    }
    setLoadingTargets(false);
  };

  useEffect(() => {
    fetchRules();
    fetchTargets();
  }, [client.id]);

  const saveRule = async () => {
    if (!form.name || !form.target_id || !form.threshold) {
      toast.error("Please fill in all fields");
      return;
    }

    const targetOptions = form.target_type === "campaign" ? campaigns : adsets;
    const target = targetOptions.find((t) => t.id === form.target_id);

    const ruleData = {
      client_id: client.id,
      name: form.name,
      campaign_id: form.target_type === "campaign" ? form.target_id : null,
      adset_id: form.target_type === "adset" ? form.target_id : null,
      target_type: form.target_type,
      target_name: target?.name || null,
      metric: "roas",
      condition: form.condition,
      threshold: parseFloat(form.threshold),
      lookback_days: parseInt(form.lookback_days),
      action: form.action,
      action_value: parseFloat(form.action_value),
      check_interval_minutes: parseInt(form.check_interval_days) * 1440,
      is_active: true,
    };

    setSaving(true);

    if (editingRuleId) {
      const { error } = await supabase
        .from("budget_rules")
        .update(ruleData)
        .eq("id", editingRuleId);
      if (error) {
        toast.error("Failed to update rule");
      } else {
        toast.success("Rule updated");
      }
    } else {
      const { error } = await supabase.from("budget_rules").insert(ruleData);
      if (error) {
        toast.error("Failed to add rule");
      } else {
        toast.success("Rule added");
      }
    }

    setShowForm(false);
    setEditingRuleId(null);
    resetForm();
    fetchRules();
    setSaving(false);
  };

  const resetForm = () => {
    setForm({
      name: "",
      target_type: "campaign",
      target_id: "",
      condition: "greater_than",
      threshold: "",
      lookback_days: "7",
      action: "increase",
      action_value: "10",
      check_interval_days: "1",
    });
  };


  const toggleRule = async (rule: BudgetRule) => {
    const { error } = await supabase
      .from("budget_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);
    if (error) {
      toast.error("Failed to update rule");
    } else {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      );
    }
  };

  const duplicateRule = (rule: BudgetRule) => {
    setForm({
      name: `${rule.name} (copy)`,
      target_type: rule.target_type as "campaign" | "adset",
      target_id: "",
      condition: rule.condition,
      threshold: String(rule.threshold),
      lookback_days: String(rule.lookback_days),
      action: rule.action,
      action_value: String(rule.action_value),
      check_interval_days: String(Math.round(rule.check_interval_minutes / 1440) || 1),
    });
    setShowForm(true);
    toast.info("Rule duplicated — please select a new campaign/ad set");
  };

  const editRule = (rule: BudgetRule) => {
    setEditingRuleId(rule.id);
    setForm({
      name: rule.name,
      target_type: rule.target_type as "campaign" | "adset",
      target_id: rule.campaign_id || rule.adset_id || "",
      condition: rule.condition,
      threshold: String(rule.threshold),
      lookback_days: String(rule.lookback_days),
      action: rule.action,
      action_value: String(rule.action_value),
      check_interval_days: String(Math.round(rule.check_interval_minutes / 1440) || 1),
    });
    setShowForm(true);
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from("budget_rules").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete rule");
    } else {
      toast.success("Rule deleted");
      setRules((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const targetOptions = form.target_type === "campaign" ? campaigns : adsets;

  const conditionLabel = (c: string) =>
    c === "greater_than" ? "greater than" : "less than";
  const actionLabel = (a: string) =>
    a === "increase" ? "increase" : "decrease";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Budget Rules — {client.name}
        </h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Rule
        </Button>
      </div>

      {/* Add rule form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">{editingRuleId ? "Edit rule" : "New Budget Rule"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rule name</Label>
              <Input
                placeholder="e.g. Scale winning campaigns"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={form.target_type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, target_type: v as "campaign" | "adset", target_id: "" }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="adset">Ad Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {form.target_type === "campaign" ? "Campaign" : "Ad Set"}
                </Label>
                {loadingTargets ? (
                  <div className="flex h-10 items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select
                    key={form.target_type}
                    value={form.target_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, target_id: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {targetOptions.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">If ROAS is</Label>
                <Select
                  value={form.condition}
                  onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greater_than">Greater than</SelectItem>
                    <SelectItem value="less_than">Less than</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">ROAS threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 3.0"
                  value={form.threshold}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Past X days</Label>
                <Input
                  type="number"
                  value={form.lookback_days}
                  onChange={(e) => setForm((f) => ({ ...f, lookback_days: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Action</Label>
                <Select
                  value={form.action}
                  onValueChange={(v) => setForm((f) => ({ ...f, action: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase budget</SelectItem>
                    <SelectItem value="decrease">Decrease budget</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">By %</Label>
                <Input
                  type="number"
                  value={form.action_value}
                  onChange={(e) => setForm((f) => ({ ...f, action_value: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Check interval (days)</Label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={form.check_interval_days}
                onChange={(e) => setForm((f) => ({ ...f, check_interval_days: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveRule} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRuleId ? "Update" : "Save rule"}
              </Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setEditingRuleId(null); resetForm(); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No budget rules yet for this client
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className={`transition-opacity ${!rule.is_active ? "opacity-60" : ""}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${rule.is_active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium text-foreground">{rule.name}</span>
                      {rule.is_active ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
                      {rule.target_type === "campaign" ? "Campaign" : "Ad Set"}:{" "}
                      <span className="text-foreground">{rule.target_name || rule.campaign_id || rule.adset_id}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      If ROAS over the past {rule.lookback_days} days is{" "}
                      <span className="text-foreground">{conditionLabel(rule.condition)} {rule.threshold}</span>
                      {" → "}
                      <span className="text-foreground">{actionLabel(rule.action)} budget by {rule.action_value}%</span>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Every {Math.round(rule.check_interval_minutes / 1440)} day(s)
                      </span>
                      {rule.last_checked_at && (
                        <span>
                          Last checked: {new Date(rule.last_checked_at).toLocaleString("en-US")}
                        </span>
                      )}
                      {rule.last_triggered_at && (
                        <span className="text-primary">
                          Last triggered: {new Date(rule.last_triggered_at).toLocaleString("en-US")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRule(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => editRule(rule)}
                      title="Edit rule"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateRule(rule)}
                      title="Duplicate rule"
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <RuleLogViewer ruleId={rule.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
