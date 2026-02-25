import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const AdminSubscriptions = () => {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: subscriptions } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
      if (!subscriptions) { setLoading(false); return; }

      const userIds = subscriptions.map((s) => s.user_id);
      const { data: configs } = await supabase.from("pet_shop_configs").select("user_id, shop_name").in("user_id", userIds);
      const nameMap = new Map((configs ?? []).map((c) => [c.user_id, c.shop_name]));

      const merged = subscriptions.map((s) => ({ ...s, clientName: nameMap.get(s.user_id) ?? "Sem nome" }));
      setSubs(merged);
      setLoading(false);
    };
    fetch();
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-400",
      cancelled: "bg-red-500/15 text-red-400",
      expired: "bg-orange-500/15 text-orange-400",
      trialing: "bg-blue-500/15 text-blue-400",
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
        <h1 className="text-2xl font-bold text-white">Assinaturas</h1>
        <p className="text-sm text-[hsl(220,10%,50%)]">{subs.length} registros</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[hsl(220,15%,15%)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[hsl(220,20%,10%)] text-[hsl(220,10%,50%)] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Plano</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Próx. cobrança</th>
              <th className="text-left px-4 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(220,15%,15%)]">
            {subs.map((s) => (
              <tr key={s.id} className="hover:bg-[hsl(220,20%,11%)] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{s.clientName}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,65%)] capitalize">{s.plan}</td>
                <td className="px-4 py-3">{statusBadge(s.status)}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,55%)]">
                  {s.current_period_end ? format(new Date(s.current_period_end), "dd/MM/yyyy") : "—"}
                </td>
                <td className="px-4 py-3 text-[hsl(220,10%,55%)]">
                  {format(new Date(s.created_at), "dd/MM/yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSubscriptions;
