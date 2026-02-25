import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
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
      ] = await Promise.all([
        supabase.from("pet_shop_configs").select("id", { count: "exact", head: true }).eq("activated", true),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("payment_history").select("amount").eq("status", "paid").gte("paid_at", `${monthStart}T00:00:00`).lte("paid_at", `${monthEnd}T23:59:59`),
        supabase.from("payment_history").select("id", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("payment_history").select("id", { count: "exact", head: true }).eq("status", "declined"),
        supabase.from("conversation_messages").select("id", { count: "exact", head: true }).gte("created_at", `${monthStart}T00:00:00`).lte("created_at", `${monthEnd}T23:59:59`),
        supabase.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", `${monthStart}T00:00:00`).lte("created_at", `${monthEnd}T23:59:59`),
      ]);

      const payments = paymentsMonth.data ?? [];
      const revenueMonth = payments.reduce((s, p) => s + Number(p.amount), 0);
      const ticketMedio = payments.length > 0 ? revenueMonth / payments.length : 0;

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
    </div>
  );
};

export default AdminDashboard;
