import { useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Loader2, Cpu } from "lucide-react";

const AdminAiUsage = () => {
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("ai_usage").select("tokens_used");
      if (!data) { setLoading(false); return; }
      setTotalRequests(data.length);
      setTotalTokens(data.reduce((s, r) => s + r.tokens_used, 0));
      setLoading(false);
    };
    fetch();
  }, []);

  // Estimated cost: ~$0.01 per 1M input tokens for Gemini 3 Flash
  const estimatedCost = (totalTokens / 1_000_000) * 0.01;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Consumo Gemini 3 Flash</h1>
        <p className="text-sm text-[hsl(220,10%,50%)]">Monitoramento de uso de IA</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total de requisições", value: totalRequests.toLocaleString("pt-BR"), icon: Cpu, color: "bg-pink-500/15 text-pink-400" },
          { label: "Tokens consumidos", value: totalTokens.toLocaleString("pt-BR"), icon: Cpu, color: "bg-violet-500/15 text-violet-400" },
          { label: "Custo estimado", value: `US$ ${estimatedCost.toFixed(4)}`, icon: Cpu, color: "bg-amber-500/15 text-amber-400" },
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

export default AdminAiUsage;
