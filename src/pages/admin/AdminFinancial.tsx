import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, DollarSign, TrendingUp, BarChart3, Download } from "lucide-react";

const AdminFinancial = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("payment_history").select("*").eq("status", "paid").order("paid_at", { ascending: false });
      setPayments(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthPayments = payments.filter((p) => p.paid_at?.startsWith(currentMonth));
  const monthRevenue = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
  const ticketMedio = monthPayments.length > 0 ? monthRevenue / monthPayments.length : 0;
  const activeSubs = new Set(payments.map((p) => p.user_id)).size;
  const mrr = activeSubs > 0 ? monthRevenue : 0;

  const exportCSV = () => {
    const header = "ID,Valor,Status,Data,Descrição\n";
    const rows = payments.map((p) => `${p.id},${p.amount},${p.status},${p.paid_at ?? ""},${p.description}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financeiro.csv";
    a.click();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-sm text-[hsl(220,10%,50%)]">Resumo financeiro</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(220,20%,12%)] border border-[hsl(220,15%,18%)] text-sm text-[hsl(220,10%,65%)] hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Faturamento total", value: fmt(totalRevenue), icon: DollarSign, color: "bg-emerald-500/15 text-emerald-400" },
          { label: "Faturamento mensal", value: fmt(monthRevenue), icon: BarChart3, color: "bg-blue-500/15 text-blue-400" },
          { label: "Ticket médio", value: fmt(ticketMedio), icon: TrendingUp, color: "bg-violet-500/15 text-violet-400" },
          { label: "MRR", value: fmt(mrr), icon: DollarSign, color: "bg-amber-500/15 text-amber-400" },
        ].map((item) => (
          <div key={item.label} className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">{item.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminFinancial;
