import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const AdminLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "error" | "warning">("all");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("admin_error_logs").select("*").order("created_at", { ascending: false }).limit(100);
      setLogs(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.severity === filter);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Logs & Erros</h1>
        <p className="text-sm text-[hsl(220,10%,50%)]">{logs.length} registros</p>
      </div>

      <div className="flex gap-1 bg-[hsl(220,20%,10%)] rounded-lg p-1 w-fit">
        {(["all", "error", "warning"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "text-[hsl(220,10%,55%)] hover:text-white"
            }`}
          >
            {f === "all" ? "Todos" : f === "error" ? "Erros" : "Avisos"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((log) => (
          <div key={log.id} className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-4">
            <div className="flex items-start gap-3">
              {log.severity === "error" ? (
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    log.severity === "error" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
                  }`}>
                    {log.severity}
                  </span>
                  {log.endpoint && (
                    <span className="text-xs text-[hsl(220,10%,45%)] font-mono">{log.endpoint}</span>
                  )}
                  <span className="text-xs text-[hsl(220,10%,40%)]">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                  </span>
                </div>
                <p className="text-sm text-white mt-1">{log.error_message}</p>
                {log.stack_trace && (
                  <pre className="text-xs text-[hsl(220,10%,40%)] mt-2 overflow-x-auto font-mono bg-[hsl(220,20%,8%)] rounded p-2">
                    {log.stack_trace.slice(0, 500)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[hsl(220,10%,40%)]">
            Nenhum log encontrado
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogs;
