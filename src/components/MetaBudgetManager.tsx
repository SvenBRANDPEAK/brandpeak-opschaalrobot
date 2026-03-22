import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Search, DollarSign, TrendingUp } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  daily_budget?: string;
  lifetime_budget?: string;
  status: string;
  budget_remaining?: string;
};

type AdSet = {
  id: string;
  name: string;
  daily_budget?: string;
  lifetime_budget?: string;
  status: string;
  campaign_id: string;
};

export function MetaBudgetManager() {
  const [adAccountId, setAdAccountId] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"campaigns" | "adsets">("campaigns");

  const formatBudget = (cents?: string) => {
    if (!cents) return "—";
    return `€${(parseInt(cents) / 100).toFixed(2)}`;
  };

  const fetchCampaigns = async () => {
    if (!adAccountId.trim()) {
      toast.error("Vul een Ad Account ID in");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-budget", {
        body: { action: "list_campaigns", ad_account_id: adAccountId.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCampaigns(data?.data || []);
      toast.success(`${data?.data?.length || 0} campagnes gevonden`);
    } catch (err: any) {
      toast.error(err.message || "Fout bij ophalen campagnes");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdSets = async () => {
    if (!adAccountId.trim()) {
      toast.error("Vul een Ad Account ID in");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-budget", {
        body: { action: "list_adsets", ad_account_id: adAccountId.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAdSets(data?.data || []);
      toast.success(`${data?.data?.length || 0} ad sets gevonden`);
    } catch (err: any) {
      toast.error(err.message || "Fout bij ophalen ad sets");
    } finally {
      setLoading(false);
    }
  };

  const updateBudget = async (id: string, type: "campaign" | "adset") => {
    const newBudget = budgetInputs[id];
    if (!newBudget || isNaN(parseFloat(newBudget))) {
      toast.error("Vul een geldig bedrag in");
      return;
    }

    setUpdatingId(id);
    try {
      const body: any = {
        action: "update_budget",
        daily_budget: parseFloat(newBudget),
      };
      if (type === "campaign") body.campaign_id = id;
      else body.adset_id = id;

      const { data, error } = await supabase.functions.invoke("meta-ads-budget", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Budget succesvol bijgewerkt!");
      setBudgetInputs((prev) => ({ ...prev, [id]: "" }));

      // Refresh
      if (activeTab === "campaigns") fetchCampaigns();
      else fetchAdSets();
    } catch (err: any) {
      toast.error(err.message || "Fout bij bijwerken budget");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLoad = () => {
    if (activeTab === "campaigns") fetchCampaigns();
    else fetchAdSets();
  };

  const statusColor = (status: string) => {
    if (status === "ACTIVE") return "text-success";
    if (status === "PAUSED") return "text-muted-foreground";
    return "text-destructive";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Account Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Ad Account
          </CardTitle>
          <CardDescription>
            Vul je Meta Ad Account ID in (bijv. 123456789 of act_123456789)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Ad Account ID"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleLoad} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Laden"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "campaigns" ? "default" : "secondary"}
          onClick={() => setActiveTab("campaigns")}
          className="flex-1"
        >
          Campagnes
        </Button>
        <Button
          variant={activeTab === "adsets" ? "default" : "secondary"}
          onClick={() => setActiveTab("adsets")}
          className="flex-1"
        >
          Ad Sets
        </Button>
      </div>

      {/* Results */}
      {activeTab === "campaigns" && campaigns.length > 0 && (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={statusColor(c.status)}>{c.status}</span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        Dagbudget: {formatBudget(c.daily_budget)}
                      </span>
                      {c.budget_remaining && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Resterend: {formatBudget(c.budget_remaining)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`budget-${c.id}`} className="text-xs text-muted-foreground">
                        Nieuw dagbudget (€)
                      </Label>
                      <Input
                        id={`budget-${c.id}`}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={budgetInputs[c.id] || ""}
                        onChange={(e) =>
                          setBudgetInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        className="w-28"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => updateBudget(c.id, "campaign")}
                      disabled={updatingId === c.id}
                      className="mt-5"
                    >
                      {updatingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Opslaan"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "adsets" && adSets.length > 0 && (
        <div className="space-y-3">
          {adSets.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{a.name}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={statusColor(a.status)}>{a.status}</span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        Dagbudget: {formatBudget(a.daily_budget)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`budget-${a.id}`} className="text-xs text-muted-foreground">
                        Nieuw dagbudget (€)
                      </Label>
                      <Input
                        id={`budget-${a.id}`}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={budgetInputs[a.id] || ""}
                        onChange={(e) =>
                          setBudgetInputs((prev) => ({ ...prev, [a.id]: e.target.value }))
                        }
                        className="w-28"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => updateBudget(a.id, "adset")}
                      disabled={updatingId === a.id}
                      className="mt-5"
                    >
                      {updatingId === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Opslaan"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {activeTab === "campaigns" && campaigns.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Vul je Ad Account ID in en klik op "Laden" om je campagnes te zien
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === "adsets" && adSets.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              Vul je Ad Account ID in en klik op "Laden" om je ad sets te zien
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
