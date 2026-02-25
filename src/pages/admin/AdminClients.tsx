import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";
import { differenceInDays } from "date-fns";
import AdminPagination from "@/components/admin/AdminPagination";

const PAGE_SIZE = 20;

const AdminClients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      const { data: configs } = await supabase
        .from("pet_shop_configs")
        .select("*")
        .eq("activated", true)
        .order("created_at", { ascending: false });

      if (!configs) { setLoading(false); return; }

      const userIds = configs.map((c) => c.user_id);

      const [subsRes, msgRes] = await Promise.all([
        supabase.from("subscriptions").select("*").in("user_id", userIds),
        supabase.from("conversation_messages").select("user_id").in("user_id", userIds),
      ]);

      const subsMap = new Map((subsRes.data ?? []).map((s) => [s.user_id, s]));
      const msgCount = new Map<string, number>();
      (msgRes.data ?? []).forEach((m) => msgCount.set(m.user_id, (msgCount.get(m.user_id) ?? 0) + 1));

      const merged = configs.map((c) => {
        const sub = subsMap.get(c.user_id);
        const trialDays = sub?.trial_end_at ? differenceInDays(new Date(sub.trial_end_at), new Date()) : null;
        return {
          ...c,
          plan: sub?.plan ?? "—",
          subStatus: sub?.status ?? "—",
          trialDaysLeft: trialDays !== null && trialDays >= 0 ? trialDays : null,
          paymentStatus: sub?.last_payment_status ?? "—",
          messages: msgCount.get(c.user_id) ?? 0,
        };
      });

      setClients(merged);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = clients.filter((c) => c.shop_name?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-400",
      cancelled: "bg-red-500/15 text-red-400",
      expired: "bg-orange-500/15 text-orange-400",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-[hsl(220,10%,50%)]">{clients.length} clientes ativos</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220,10%,40%)]" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 pr-4 w-full sm:w-72 rounded-lg bg-[hsl(220,20%,12%)] border border-[hsl(220,15%,18%)] text-sm text-white placeholder:text-[hsl(220,10%,35%)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[hsl(220,15%,15%)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[hsl(220,20%,10%)] text-[hsl(220,10%,50%)] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium">Plano</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Trial</th>
              <th className="text-left px-4 py-3 font-medium">Mensagens</th>
              <th className="text-left px-4 py-3 font-medium">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(220,15%,15%)]">
            {paginated.map((c) => (
              <tr key={c.id} className="hover:bg-[hsl(220,20%,11%)] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{c.shop_name}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,65%)] capitalize">{c.plan}</td>
                <td className="px-4 py-3">{statusBadge(c.subStatus)}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,55%)]">
                  {c.trialDaysLeft !== null ? `${c.trialDaysLeft}d` : "—"}
                </td>
                <td className="px-4 py-3 text-[hsl(220,10%,65%)]">{c.messages}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.whatsapp_status === "connected" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {c.whatsapp_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
};

export default AdminClients;
