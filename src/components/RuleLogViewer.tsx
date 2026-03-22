import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp, CheckCircle, AlertCircle, XCircle } from "lucide-react";

type LogEntry = {
  id: string;
  status: string;
  roas: number | null;
  old_budget: number | null;
  new_budget: number | null;
  message: string | null;
  created_at: string;
};

export function RuleLogViewer({ ruleId }: { ruleId: string }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rule_logs")
      .select("*")
      .eq("rule_id", ruleId)
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs(data || []);
    setLoading(false);
    setLoaded(true);
  };

  const toggle = () => {
    if (!open && !loaded) fetchLogs();
    setOpen(!open);
  };

  const statusIcon = (status: string) => {
    if (status === "triggered") return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
    if (status === "error") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="mt-2">
      <Button variant="ghost" size="sm" onClick={toggle} className="h-7 px-2 text-xs text-muted-foreground">
        {open ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
        Logboek
      </Button>

      {open && (
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nog geen logs</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  {statusIcon(log.status)}
                  <div className="flex-1">
                    <span className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("nl-NL")}
                    </span>
                    {" — "}
                    <span className="text-foreground">{log.message || log.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
