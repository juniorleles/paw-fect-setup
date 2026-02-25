import { useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Cpu,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Stats {
  totalClients: number;
  activeSubscriptions: number;
  revenueMonth: number;
  ticketMedio: number;
  overduePayments: number;
  declinedPayments: number;
  totalMessages: number;
  totalAiRequests: number;
}

interface MonthlyRevenue {
  month: string;
  label: string;
  revenue: number;
}

interface MonthlyClients {
  month: string;
  label: string;
  clients: number;
}

interface MonthlyMessages {
  month: string;
  label: string;
  messages: number;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  format,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  format?: "currency" | "number";
}) => {
  const formatted =
    format === "currency"
      ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : value.toLocaleString("pt-BR");

  return (
    <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{formatted}</p>
    </div>
  );
};

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueChart, setRevenueChart] = useState<MonthlyRevenue[]>([]);
  const [clientsChart, setClientsChart] = useState<MonthlyClients[]>([]);
  const [messagesChart, setMessagesChart] = useState<MonthlyMessages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      const [
        clientsRes,
        activeSubs,
        paymentsMonth,
        overdueRes,
        declinedRes,
        messagesRes,
        aiRes,
        allPayments,
        allConfigs,
        allMessages,
      ] = await Promise.all([
        supabase.from("pet_shop_configs").select("id", { count: "exact", head: true }).eq("activated", true),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("payment_history").select("amount").eq("status", "paid").gte("paid_at", `${monthStart}T00:00:00`).lte("paid_at", `${monthEnd}T23:59:59`),
        supabase.from("payment_history").select("id", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("payment_history").select("id", { count: "exact", head: true }).eq("status", "declined"),
        supabase.from("conversation_messages").select("id", { count: "exact", head: true }).gte("created_at", `${monthStart}T00:00:00`).lte("created_at", `${monthEnd}T23:59:59`),
        supabase.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", `${monthStart}T00:00:00`).lte("created_at", `${monthEnd}T23:59:59`),
        supabase.from("payment_history").select("amount, paid_at").eq("status", "paid").order("paid_at", { ascending: true }),
        supabase.from("pet_shop_configs").select("created_at").eq("activated", true).order("created_at", { ascending: true }),
        supabase.from("conversation_messages").select("created_at").order("created_at", { ascending: true }),
      ]);

      const payments = paymentsMonth.data ?? [];
      const revenueMonth = payments.reduce((s, p) => s + Number(p.amount), 0);
      const ticketMedio = payments.length > 0 ? revenueMonth / payments.length : 0;

      // Build last 6 months revenue chart
      const revenueByMonth: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        revenueByMonth[key] = 0;
      }
      (allPayments.data ?? []).forEach((p) => {
        if (p.paid_at) {
          const key = p.paid_at.substring(0, 7);
          if (key in revenueByMonth) revenueByMonth[key] += Number(p.amount);
        }
      });
      setRevenueChart(
        Object.entries(revenueByMonth).map(([month, revenue]) => ({
          month,
          label: MONTH_LABELS[parseInt(month.split("-")[1]) - 1],
          revenue,
        }))
      );

      // Build last 6 months cumulative client growth
      const clientsByMonth: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        clientsByMonth[key] = 0;
      }
      const sortedMonths = Object.keys(clientsByMonth).sort();
      (allConfigs.data ?? []).forEach((c) => {
        const key = c.created_at.substring(0, 7);
        sortedMonths.forEach((m) => {
          if (key <= m) clientsByMonth[m]++;
        });
      });
      setClientsChart(
        sortedMonths.map((month) => ({
          month,
          label: MONTH_LABELS[parseInt(month.split("-")[1]) - 1],
          clients: clientsByMonth[month],
        }))
      );

      // Build last 6 months messages chart
      const messagesByMonth: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        messagesByMonth[key] = 0;
      }
      (allMessages.data ?? []).forEach((m) => {
        const key = m.created_at.substring(0, 7);
        if (key in messagesByMonth) messagesByMonth[key]++;
      });
      setMessagesChart(
        Object.keys(messagesByMonth).sort().map((month) => ({
          month,
          label: MONTH_LABELS[parseInt(month.split("-")[1]) - 1],
          messages: messagesByMonth[month],
        }))
      );

      setStats({
        totalClients: clientsRes.count ?? 0,
        activeSubscriptions: activeSubs.count ?? 0,
        revenueMonth,
        ticketMedio,
        overduePayments: overdueRes.count ?? 0,
        declinedPayments: declinedRes.count ?? 0,
        totalMessages: messagesRes.count ?? 0,
        totalAiRequests: aiRes.count ?? 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-[hsl(220,10%,50%)]">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clientes ativos" value={stats.totalClients} icon={Users} color="bg-blue-500/15 text-blue-400" />
        <StatCard label="Assinaturas ativas" value={stats.activeSubscriptions} icon={CreditCard} color="bg-emerald-500/15 text-emerald-400" />
        <StatCard label="Faturamento do mês" value={stats.revenueMonth} icon={DollarSign} color="bg-violet-500/15 text-violet-400" format="currency" />
        <StatCard label="Ticket médio" value={stats.ticketMedio} icon={TrendingUp} color="bg-amber-500/15 text-amber-400" format="currency" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pagamentos em atraso" value={stats.overduePayments} icon={AlertTriangle} color="bg-orange-500/15 text-orange-400" />
        <StatCard label="Pagamentos recusados" value={stats.declinedPayments} icon={XCircle} color="bg-red-500/15 text-red-400" />
        <StatCard label="Mensagens no mês" value={stats.totalMessages} icon={MessageSquare} color="bg-cyan-500/15 text-cyan-400" />
        <StatCard label="Requisições Gemini" value={stats.totalAiRequests} icon={Cpu} color="bg-pink-500/15 text-pink-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Faturamento mensal</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                <XAxis dataKey="label" tick={{ fill: "hsl(220,10%,50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, color: "#fff" }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "Faturamento"]}
                  labelStyle={{ color: "hsl(220,10%,60%)" }}
                />
                <Bar dataKey="revenue" fill="hsl(142,71%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Growth Chart */}
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Crescimento de clientes</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clientsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                <XAxis dataKey="label" tick={{ fill: "hsl(220,10%,50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, color: "#fff" }}
                  formatter={(value: number) => [value, "Clientes"]}
                  labelStyle={{ color: "hsl(220,10%,60%)" }}
                />
                <Line type="monotone" dataKey="clients" stroke="hsl(217,91%,60%)" strokeWidth={2} dot={{ fill: "hsl(217,91%,60%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Messages Chart */}
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Mensagens por mês</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={messagesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                <XAxis dataKey="label" tick={{ fill: "hsl(220,10%,50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(220,10%,50%)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, color: "#fff" }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Mensagens"]}
                  labelStyle={{ color: "hsl(220,10%,60%)" }}
                />
                <Bar dataKey="messages" fill="hsl(187,71%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
