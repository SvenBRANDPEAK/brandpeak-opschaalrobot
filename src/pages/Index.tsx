import { MetaBudgetManager } from "@/components/MetaBudgetManager";

const Index = () => {
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
            <h1 className="text-lg font-semibold text-foreground">Meta Ads Budget Tool</h1>
            <p className="text-sm text-muted-foreground">Beheer je advertentiebudgetten</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <MetaBudgetManager />
      </main>
    </div>
  );
};

export default Index;
