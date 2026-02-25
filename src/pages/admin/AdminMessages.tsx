import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare } from "lucide-react";

const AdminMessages = () => {
  const [totalMessages, setTotalMessages] = useState(0);
  const [byClient, setByClient] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: messages } = await supabase.from("conversation_messages").select("user_id");
      if (!messages) { setLoading(false); return; }

      setTotalMessages(messages.length);

      const countMap = new Map<string, number>();
      messages.forEach((m) => countMap.set(m.user_id, (countMap.get(m.user_id) ?? 0) + 1));

      const userIds = [...countMap.keys()];
      const { data: configs } = await supabase.from("pet_shop_configs").select("user_id, shop_name").in("user_id", userIds);
      const nameMap = new Map((configs ?? []).map((c) => [c.user_id, c.shop_name]));

      const sorted = [...countMap.entries()]
        .map(([uid, count]) => ({ name: nameMap.get(uid) ?? uid.slice(0, 8), count }))
        .sort((a, b) => b.count - a.count);

      setByClient(sorted);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mensagens</h1>
        <p className="text-sm text-[hsl(220,10%,50%)]">{totalMessages} mensagens no total</p>
      </div>

      <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalMessages}</p>
            <p className="text-xs text-[hsl(220,10%,50%)]">Total de mensagens disparadas</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider mb-3">Por cliente</h2>
        <div className="overflow-x-auto rounded-xl border border-[hsl(220,15%,15%)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(220,20%,10%)] text-[hsl(220,10%,50%)] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Mensagens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(220,15%,15%)]">
              {byClient.map((c, i) => (
                <tr key={i} className="hover:bg-[hsl(220,20%,11%)] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-[hsl(220,10%,65%)]">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
