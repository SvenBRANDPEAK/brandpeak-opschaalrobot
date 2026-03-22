import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Users } from "lucide-react";

export type Client = {
  id: string;
  name: string;
  ad_account_id: string;
  created_at: string;
};

type Props = {
  onSelectClient: (client: Client) => void;
  selectedClientId?: string;
};

export function ClientManager({ onSelectClient, selectedClientId }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchClients = async () => {
    const { data, error } = await supabase.from("clients").select("*").order("name");
    if (error) {
      toast.error("Fout bij ophalen klanten");
      return;
    }
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const addClient = async () => {
    if (!newName.trim() || !newAccountId.trim()) {
      toast.error("Vul naam en Ad Account ID in");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("clients").insert({
      name: newName.trim(),
      ad_account_id: newAccountId.trim(),
    });
    if (error) {
      toast.error("Fout bij toevoegen klant");
    } else {
      toast.success("Klant toegevoegd");
      setNewName("");
      setNewAccountId("");
      fetchClients();
    }
    setAdding(false);
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      toast.error("Fout bij verwijderen klant");
    } else {
      toast.success("Klant verwijderd");
      fetchClients();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add client */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" />
            Klant toevoegen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Klantnaam</Label>
              <Input
                placeholder="Bijv. Acme Inc."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Ad Account ID</Label>
              <Input
                placeholder="123456789"
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
              />
            </div>
            <Button onClick={addClient} disabled={adding} className="mt-auto">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Toevoegen"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client list */}
      {clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nog geen klanten toegevoegd</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <Card
              key={client.id}
              className={`cursor-pointer transition-colors hover:border-primary/50 ${
                selectedClientId === client.id ? "border-primary bg-accent/50" : ""
              }`}
              onClick={() => onSelectClient(client)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-foreground">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Account: {client.ad_account_id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteClient(client.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
