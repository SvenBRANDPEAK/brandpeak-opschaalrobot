import { useState } from "react";
import { MetaBudgetManager } from "@/components/MetaBudgetManager";
import { ClientManager, type Client } from "@/components/ClientManager";
import { BudgetRulesManager } from "@/components/BudgetRulesManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary-foreground">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Meta Ads Manager</h1>
            <p className="text-sm text-muted-foreground">Budget beheer & automatische regels</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clients">Klanten</TabsTrigger>
            <TabsTrigger value="rules">Budget Rules</TabsTrigger>
            <TabsTrigger value="manual">Handmatig</TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <ClientManager
              onSelectClient={(c) => setSelectedClient(c)}
              selectedClientId={selectedClient?.id}
            />
          </TabsContent>

          <TabsContent value="rules">
            {selectedClient ? (
              <BudgetRulesManager client={selectedClient} />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">
                  Selecteer eerst een klant in het tabblad "Klanten"
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual">
            <MetaBudgetManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
