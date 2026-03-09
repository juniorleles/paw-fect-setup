import { useEffect, useState, useCallback } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  MessageSquare,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface WhatsAppClient {
  id: string;
  user_id: string;
  shop_name: string;
  phone: string;
  evolution_instance_name: string;
  whatsapp_status: string;
  meta_waba_id: string | null;
  meta_phone_number_id: string | null;
  meta_access_token: string | null;
  niche: string;
  activated: boolean;
  updated_at: string;
}

interface MessageStats {
  user_id: string;
  shop_name: string;
  count: number;
}

const AdminWhatsApp = () => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<WhatsAppClient[]>([]);
  const [messageStats, setMessageStats] = useState<MessageStats[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "connected" | "disconnected" | "meta" | "evolution">("all");
  const [dailyMessages, setDailyMessages] = useState<{ day: string; count: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [configsRes, messagesRes, dailyMsgsRes] = await Promise.all([
      supabase
        .from("pet_shop_configs")
        .select("id, user_id, shop_name, phone, evolution_instance_name, whatsapp_status, meta_waba_id, meta_phone_number_id, meta_access_token, niche, activated, updated_at")
        .order("shop_name", { ascending: true })
        .limit(500),
      // Messages per user in last 7 days
      supabase
        .from("conversation_messages")
        .select("user_id, created_at")
        .gte("created_at", last7d)
        .limit(1000),
      // Daily messages for chart (last 30 days)
      supabase
        .from("conversation_messages")
        .select("created_at")
        .gte("created_at", last30d)
        .order("created_at", { ascending: true })
        .limit(1000),
    ]);

    setClients((configsRes.data ?? []) as WhatsAppClient[]);

    // Aggregate messages per user
    const msgMap: Record<string, number> = {};
    (messagesRes.data ?? []).forEach((m: any) => {
      msgMap[m.user_id] = (msgMap[m.user_id] || 0) + 1;
    });
    const configs = (configsRes.data ?? []) as WhatsAppClient[];
    const stats: MessageStats[] = configs
      .map((c) => ({ user_id: c.user_id, shop_name: c.shop_name, count: msgMap[c.user_id] || 0 }))
      .sort((a, b) => b.count - a.count);
    setMessageStats(stats);

    // Daily messages chart
    const dayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      dayMap[key] = 0;
    }
    (dailyMsgsRes.data ?? []).forEach((m: any) => {
      const d = new Date(m.created_at);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in dayMap) dayMap[key]++;
    });
    setDailyMessages(Object.entries(dayMap).map(([day, count]) => ({ day, count })));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const connectedCount = clients.filter((c) => c.whatsapp_status === "connected").length;
  const disconnectedCount = clients.filter((c) => c.whatsapp_status !== "connected").length;
  const metaCount = clients.filter((c) => !!c.meta_waba_id).length;
  const evolutionCount = clients.filter((c) => !c.meta_waba_id && c.evolution_instance_name).length;
  const totalMessages7d = messageStats.reduce((sum, s) => sum + s.count, 0);

  const getIntegrationType = (c: WhatsAppClient) => {
    if (c.meta_waba_id) return "meta";
    if (c.evolution_instance_name) return "evolution";
    return "none";
  };

  const hasValidToken = (c: WhatsAppClient) => !!c.meta_access_token;

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      !search ||
      c.shop_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.meta_waba_id && c.meta_waba_id.includes(search));

    if (!matchesSearch) return false;

    switch (filter) {
      case "connected":
        return c.whatsapp_status === "connected";
      case "disconnected":
        return c.whatsapp_status !== "connected";
      case "meta":
        return !!c.meta_waba_id;
      case "evolution":
        return !c.meta_waba_id && !!c.evolution_instance_name;
      default:
        return true;
    }
  });

  const pieData = [
    { name: "Meta Cloud", value: metaCount, color: "hsl(210,90%,55%)" },
    { name: "Evolution API", value: evolutionCount, color: "hsl(150,60%,45%)" },
    { name: "Sem integração", value: clients.length - metaCount - evolutionCount, color: "hsl(220,15%,30%)" },
  ].filter((d) => d.value > 0);

  const statusColor: Record<string, string> = {
    connected: "text-emerald-400",
    disconnected: "text-red-400",
    connecting: "text-amber-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-emerald-400" />
            WhatsApp Monitor
          </h1>
          <p className="text-sm text-[hsl(220,10%,50%)]">Conexões, tokens e volume de mensagens por cliente</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard icon={Wifi} label="Conectados" value={connectedCount} color="emerald" />
        <SummaryCard icon={WifiOff} label="Desconectados" value={disconnectedCount} color="red" />
        <SummaryCard icon={Zap} label="Meta Cloud" value={metaCount} color="blue" />
        <SummaryCard icon={ExternalLink} label="Evolution API" value={evolutionCount} color="teal" />
        <SummaryCard icon={MessageSquare} label="Msgs 7d" value={totalMessages7d} color="cyan" />
        <SummaryCard icon={Shield} label="Tokens Meta" value={clients.filter(hasValidToken).length} color="violet" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Messages */}
        <div className="lg:col-span-2 bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Mensagens por dia (últimos 7 dias)</h2>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMessages}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                <XAxis dataKey="day" tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
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

        {/* Integration Type Pie */}
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Tipo de Integração</h2>
          </div>
          <div className="h-52 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[hsl(220,10%,45%)]">Sem dados</p>
            )}
          </div>
          <div className="space-y-1 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[hsl(220,10%,60%)]">{d.name}</span>
                <span className="ml-auto text-white font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Senders */}
      {messageStats.filter((s) => s.count > 0).length > 0 && (
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Top 10 — Volume de mensagens (7 dias)
          </h2>
          <div className="space-y-2">
            {messageStats.filter((s) => s.count > 0).slice(0, 10).map((s, i) => {
              const maxCount = messageStats[0]?.count || 1;
              const pct = Math.round((s.count / maxCount) * 100);
              return (
                <div key={s.user_id} className="flex items-center gap-3">
                  <span className="text-xs text-[hsl(220,10%,45%)] w-5 text-right">{i + 1}</span>
                  <span className="text-sm text-white w-40 truncate">{s.shop_name || "Sem nome"}</span>
                  <div className="flex-1 h-5 bg-[hsl(220,15%,13%)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-500/30" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium text-white w-12 text-right">{s.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Conexões ({filteredClients.length})
          </h2>
          <div className="flex-1" />
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220,10%,40%)]" />
            <Input
              placeholder="Buscar por nome, telefone ou WABA ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[hsl(220,15%,13%)] border-[hsl(220,15%,20%)] text-white placeholder:text-[hsl(220,10%,35%)] text-sm"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            { key: "all", label: "Todos" },
            { key: "connected", label: "Conectados" },
            { key: "disconnected", label: "Desconectados" },
            { key: "meta", label: "Meta Cloud" },
            { key: "evolution", label: "Evolution" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-[hsl(220,15%,13%)] text-[hsl(220,10%,50%)] border border-[hsl(220,15%,18%)] hover:text-[hsl(220,10%,70%)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[hsl(220,10%,45%)] text-xs uppercase tracking-wider border-b border-[hsl(220,15%,15%)]">
                <th className="pb-3 pr-4">Estabelecimento</th>
                <th className="pb-3 pr-4">Telefone</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Integração</th>
                <th className="pb-3 pr-4">WABA ID</th>
                <th className="pb-3 pr-4">Token</th>
                <th className="pb-3 pr-4">Msgs 7d</th>
                <th className="pb-3">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(220,15%,13%)]">
              {filteredClients.map((c) => {
                const intType = getIntegrationType(c);
                const msgs7d = messageStats.find((s) => s.user_id === c.user_id)?.count || 0;
                return (
                  <tr key={c.id} className="hover:bg-[hsl(220,15%,12%)] transition-colors">
                    <td className="py-3 pr-4">
                      <div>
                        <p className="text-white font-medium">{c.shop_name || "Sem nome"}</p>
                        <p className="text-xs text-[hsl(220,10%,40%)]">{c.niche}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-[hsl(220,10%,60%)] font-mono text-xs">{c.phone || "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColor[c.whatsapp_status] || "text-gray-400"}`}>
                        {c.whatsapp_status === "connected" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {c.whatsapp_status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        intType === "meta"
                          ? "bg-blue-500/15 text-blue-400"
                          : intType === "evolution"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-[hsl(220,15%,15%)] text-[hsl(220,10%,40%)]"
                      }`}>
                        {intType === "meta" ? "Meta Cloud" : intType === "evolution" ? "Evolution" : "Nenhuma"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[hsl(220,10%,50%)] font-mono text-xs">
                      {c.meta_waba_id || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {intType === "meta" ? (
                        hasValidToken(c) ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle className="w-3 h-3" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Ausente
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-[hsl(220,10%,35%)]">N/A</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-white font-medium text-xs">{msgs7d > 0 ? msgs7d : "—"}</td>
                    <td className="py-3 text-[hsl(220,10%,45%)] text-xs">
                      {new Date(c.updated_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[hsl(220,10%,40%)]">
                    Nenhuma conexão encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    red: "bg-red-500/15 text-red-400",
    blue: "bg-blue-500/15 text-blue-400",
    teal: "bg-teal-500/15 text-teal-400",
    cyan: "bg-cyan-500/15 text-cyan-400",
    violet: "bg-violet-500/15 text-violet-400",
  };
  return (
    <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-xl font-bold text-white">{value.toLocaleString("pt-BR")}</p>
      <p className="text-xs text-[hsl(220,10%,45%)]">{label}</p>
    </div>
  );
};

export default AdminWhatsApp;
