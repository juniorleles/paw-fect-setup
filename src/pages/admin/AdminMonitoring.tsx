import { useEffect, useState, useCallback } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import {
  Activity,
  Zap,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Bell,
  AlertCircle,
  FileWarning,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LatencyData {
  hour: string;
  avgMs: number;
  count: number;
}

interface HourlyMessages {
  hour: string;
  count: number;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  details: any;
  resolved: boolean;
  created_at: string;
}

interface WhatsAppInstance {
  shop_name: string;
  evolution_instance_name: string;
  whatsapp_status: string;
  user_id: string;
}

const AdminMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [latencyData, setLatencyData] = useState<LatencyData[]>([]);
  const [hourlyMessages, setHourlyMessages] = useState<HourlyMessages[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [avgLatency, setAvgLatency] = useState(0);
  const [errorRate, setErrorRate] = useState(0);
  const [messagesLast24h, setMessagesLast24h] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [aiUsageRes, messagesRes, alertsRes, instancesRes, errorsRes, errorLogsRes] = await Promise.all([
      supabase
        .from("ai_usage")
        .select("created_at, response_time_ms, tokens_used")
        .gte("created_at", last24h)
        .order("created_at", { ascending: true })
        .limit(500),
      supabase
        .from("conversation_messages")
        .select("created_at")
        .gte("created_at", last24h)
        .order("created_at", { ascending: true })
        .limit(1000),
      supabase
        .from("system_alerts")
        .select("*")
        .gte("created_at", last7d)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("pet_shop_configs")
        .select("shop_name, evolution_instance_name, whatsapp_status, user_id")
        .eq("activated", true)
        .limit(200),
      supabase
        .from("admin_error_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", last24h),
      supabase
        .from("admin_error_logs")
        .select("*")
        .gte("created_at", last7d)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    // Process latency by hour
    const aiData = aiUsageRes.data ?? [];
    const latencyByHour: Record<string, { total: number; count: number }> = {};
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = `${String(h.getHours()).padStart(2, "0")}:00`;
      latencyByHour[key] = { total: 0, count: 0 };
    }
    let totalLatency = 0;
    let latencyCount = 0;
    aiData.forEach((r: any) => {
      const h = new Date(r.created_at);
      const key = `${String(h.getHours()).padStart(2, "0")}:00`;
      const ms = r.response_time_ms || 0;
      if (key in latencyByHour) {
        latencyByHour[key].total += ms;
        latencyByHour[key].count++;
      }
      if (ms > 0) {
        totalLatency += ms;
        latencyCount++;
      }
    });
    setLatencyData(
      Object.entries(latencyByHour).map(([hour, v]) => ({
        hour,
        avgMs: v.count > 0 ? Math.round(v.total / v.count) : 0,
        count: v.count,
      }))
    );
    setAvgLatency(latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0);

    // Process messages by hour
    const msgs = messagesRes.data ?? [];
    const msgByHour: Record<string, number> = {};
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = `${String(h.getHours()).padStart(2, "0")}:00`;
      msgByHour[key] = 0;
    }
    msgs.forEach((m: any) => {
      const h = new Date(m.created_at);
      const key = `${String(h.getHours()).padStart(2, "0")}:00`;
      if (key in msgByHour) msgByHour[key]++;
    });
    setHourlyMessages(
      Object.entries(msgByHour).map(([hour, count]) => ({ hour, count }))
    );
    setMessagesLast24h(msgs.length);

    // Alerts — filter out WhatsApp disconnection alerts
    const allAlerts = (alertsRes.data ?? []) as Alert[];
    const filteredAlerts = allAlerts.filter((a) => a.alert_type !== "disconnection");
    setAlerts(filteredAlerts);
    setActiveAlerts(filteredAlerts.filter((a) => !a.resolved).length);

    // Instances
    setInstances((instancesRes.data ?? []) as WhatsAppInstance[]);

    // Error rate
    const totalErrors = errorsRes.count ?? 0;
    const totalAiReqs = aiData.length;
    setErrorRate(totalAiReqs > 0 ? Math.round((totalErrors / totalAiReqs) * 100) : 0);

    // Error logs
    setErrorLogs(errorLogsRes.data ?? []);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resolveAlert = async (alertId: string) => {
    await supabase
      .from("system_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    toast.success("Alerta resolvido!");
    fetchData();
  };

  const resolveAllAlerts = async () => {
    const unresolvedIds = alerts.filter((a) => !a.resolved).map((a) => a.id);
    if (unresolvedIds.length === 0) return;
    await supabase
      .from("system_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .in("id", unresolvedIds);
    toast.success(`${unresolvedIds.length} alertas resolvidos!`);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const connectedCount = instances.filter((i) => i.whatsapp_status === "connected").length;
  const disconnectedCount = instances.filter((i) => i.whatsapp_status !== "connected").length;

  const severityColor: Record<string, string> = {
    error: "text-red-400 bg-red-500/15",
    warning: "text-amber-400 bg-amber-500/15",
    info: "text-blue-400 bg-blue-500/15",
  };

  const alertTypeLabels: Record<string, string> = {
    ai_error: "Erro na IA",
    high_latency: "Latência Alta",
    disconnection: "Desconexão WhatsApp",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Monitoramento em Tempo Real
          </h1>
          <p className="text-sm text-[hsl(220,10%,50%)]">Clique em Atualizar para recarregar os dados</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="border-[hsl(220,15%,20%)] text-[hsl(220,10%,70%)] hover:bg-[hsl(220,15%,13%)]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">Latência média IA</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/15 text-violet-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{avgLatency > 0 ? `${(avgLatency / 1000).toFixed(1)}s` : "—"}</p>
          <p className="text-xs text-[hsl(220,10%,45%)] mt-1">Últimas 24h</p>
        </div>

        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">Mensagens 24h</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{messagesLast24h.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-[hsl(220,10%,45%)] mt-1">Enviadas + recebidas</p>
        </div>

        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">Taxa de erros</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${errorRate > 10 ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>
              {errorRate > 10 ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{errorRate}%</p>
          <p className="text-xs text-[hsl(220,10%,45%)] mt-1">Últimas 24h</p>
        </div>

        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">Alertas ativos</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeAlerts > 0 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{activeAlerts}</p>
          <p className="text-xs text-[hsl(220,10%,45%)] mt-1">Não resolvidos</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Latency Chart */}
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Latência da IA (ms)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                <XAxis dataKey="hour" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}ms`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, color: "#fff" }}
                  formatter={(value: number) => [`${value}ms`, "Latência média"]}
                  labelStyle={{ color: "hsl(220,10%,60%)" }}
                />
                <Line type="monotone" dataKey="avgMs" stroke="hsl(262,83%,58%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Messages per hour */}
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Mensagens por hora</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyMessages}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                <XAxis dataKey="hour" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, color: "#fff" }}
                  formatter={(value: number) => [value, "Mensagens"]}
                  labelStyle={{ color: "hsl(220,10%,60%)" }}
                />
                <Bar dataKey="count" fill="hsl(187,71%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* WhatsApp Instances Status */}
      <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Instâncias WhatsApp</h2>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-emerald-400">{connectedCount} online</span>
            <span className="text-red-400">{disconnectedCount} offline</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {instances.map((inst) => (
            <div
              key={inst.user_id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,17%)]"
            >
              {inst.whatsapp_status === "connected" ? (
                <Wifi className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{inst.shop_name || "Sem nome"}</p>
                <p className="text-xs text-[hsl(220,10%,45%)] font-mono truncate">{inst.evolution_instance_name || "—"}</p>
              </div>
              <span
                className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  inst.whatsapp_status === "connected"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-red-500/15 text-red-400"
                }`}
              >
                {inst.whatsapp_status}
              </span>
            </div>
          ))}
          {instances.length === 0 && (
            <p className="text-sm text-[hsl(220,10%,45%)] col-span-full">Nenhuma instância ativa</p>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Alertas Recentes</h2>
          <span className="text-xs text-[hsl(220,10%,45%)]">Últimos 7 dias · Desconexões WhatsApp ocultas</span>
          <div className="ml-auto flex items-center gap-2">
            {alerts.some((a) => !a.resolved) && (
              <Button
                variant="outline"
                size="sm"
                onClick={resolveAllAlerts}
                className="text-xs border-[hsl(220,15%,20%)] text-emerald-400 hover:bg-emerald-500/10 h-7"
              >
                Limpar Todos
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {alerts.length === 0 && (
            <p className="text-sm text-[hsl(220,10%,45%)] text-center py-4">🎉 Nenhum alerta — tudo funcionando bem!</p>
          )}
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                alert.resolved
                  ? "bg-[hsl(220,15%,11%)] border-[hsl(220,15%,15%)] opacity-60"
                  : "bg-[hsl(220,15%,13%)] border-[hsl(220,15%,17%)]"
              }`}
            >
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor[alert.severity] || severityColor.info}`}>
                {alert.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{alert.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[hsl(220,10%,45%)]">
                    {alertTypeLabels[alert.alert_type] || alert.alert_type}
                  </span>
                  <span className="text-xs text-[hsl(220,10%,35%)]">·</span>
                  <span className="text-xs text-[hsl(220,10%,45%)]">
                    {new Date(alert.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
              {!alert.resolved && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resolveAlert(alert.id)}
                  className="text-xs text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 h-auto"
                >
                  Resolver
                </Button>
              )}
              {alert.resolved && (
                <span className="text-xs text-emerald-400/60">Resolvido</span>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Error Logs */}
      <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileWarning className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white">Logs de Erros — Mensagens</h2>
          <span className="text-xs text-[hsl(220,10%,45%)]">Últimos 7 dias · {errorLogs.length} registros</span>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {errorLogs.length === 0 && (
            <p className="text-sm text-[hsl(220,10%,45%)] text-center py-4">🎉 Nenhum erro registrado!</p>
          )}
          {errorLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,17%)]"
            >
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
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-white mt-1 break-words">{log.error_message}</p>
                {log.stack_trace && (
                  <pre className="text-xs text-[hsl(220,10%,40%)] mt-2 overflow-x-auto font-mono bg-[hsl(220,20%,8%)] rounded p-2 max-h-24 overflow-y-auto">
                    {log.stack_trace.slice(0, 500)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminMonitoring;
