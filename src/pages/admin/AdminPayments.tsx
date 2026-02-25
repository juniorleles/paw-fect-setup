import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import AdminPagination from "@/components/admin/AdminPagination";

const PAGE_SIZE = 20;

const tabs = [
  { key: "paid", label: "Aprovados" },
  { key: "declined", label: "Recusados" },
  { key: "overdue", label: "Em atraso" },
];

const AdminPayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("paid");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("payment_history").select("*").order("created_at", { ascending: false });
      setPayments(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = payments.filter((p) => p.status === activeTab);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when tab changes
  useEffect(() => { setPage(1); }, [activeTab]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid: "bg-emerald-500/15 text-emerald-400",
      declined: "bg-red-500/15 text-red-400",
      overdue: "bg-orange-500/15 text-orange-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-[hsl(220,15%,18%)] text-[hsl(220,10%,55%)]"}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pagamentos</h1>
        <p className="text-sm text-[hsl(220,10%,50%)]">{payments.length} registros</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[hsl(220,20%,10%)] rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "text-[hsl(220,10%,55%)] hover:text-white"
            }`}
          >
            {tab.label} ({payments.filter((p) => p.status === tab.key).length})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[hsl(220,15%,15%)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[hsl(220,20%,10%)] text-[hsl(220,10%,50%)] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Descrição</th>
              <th className="text-left px-4 py-3 font-medium">Valor</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(220,15%,15%)]">
            {paginated.map((p) => (
              <tr key={p.id} className="hover:bg-[hsl(220,20%,11%)] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{p.description}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,65%)]">
                  {Number(p.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="px-4 py-3">{statusBadge(p.status)}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,55%)]">
                  {p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy") : "—"}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-[hsl(220,10%,40%)]">Nenhum registro</td>
              </tr>
            )}
          </tbody>
        </table>
        <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
};

export default AdminPayments;
