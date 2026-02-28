import { useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Loader2, Cpu, Zap, DollarSign } from "lucide-react";

interface ModelStats {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
}

// Pricing per 1M input tokens (USD)
const MODEL_PRICING: Record<string, number> = {
  "google/gemini-3-flash-preview": 0.01,
  "google/gemini-2.5-flash": 0.15,
  "google/gemini-2.5-flash-lite": 0.01,
  "google/gemini-2.5-pro": 1.25,
  "google/gemini-3-pro-preview": 1.25,
  "openai/gpt-5": 10.0,
  "openai/gpt-5-mini": 1.5,
  "openai/gpt-5-nano": 0.1,
};

const getModelLabel = (model: string) => {
  const parts = model.split("/");
  return parts.length > 1 ? parts[1] : model;
};

const AdminAiUsage = () => {
  const [modelStats, setModelStats] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("ai_usage").select("tokens_used, model");
      if (!data) { setLoading(false); return; }

      const grouped: Record<string, { requests: number; tokens: number }> = {};
      for (const row of data) {
        const model = row.model || "unknown";
        if (!grouped[model]) grouped[model] = { requests: 0, tokens: 0 };
        grouped[model].requests++;
        grouped[model].tokens += row.tokens_used;
      }

      const stats: ModelStats[] = Object.entries(grouped)
        .map(([model, s]) => ({
          model,
          requests: s.requests,
          tokens: s.tokens,
          cost: (s.tokens / 1_000_000) * (MODEL_PRICING[model] ?? 0.01),
        }))
        .sort((a, b) => b.requests - a.requests);

      setModelStats(stats);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalRequests = modelStats.reduce((s, m) => s + m.requests, 0);
  const totalTokens = modelStats.reduce((s, m) => s + m.tokens, 0);
  const totalCost = modelStats.reduce((s, m) => s + m.cost, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Consumo de IA</h1>
        <p className="text-sm text-[hsl(220,10%,50%)]">Monitoramento de uso por modelo</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total de requisições", value: totalRequests.toLocaleString("pt-BR"), icon: Cpu, color: "bg-pink-500/15 text-pink-400" },
          { label: "Tokens consumidos", value: totalTokens.toLocaleString("pt-BR"), icon: Zap, color: "bg-violet-500/15 text-violet-400" },
          { label: "Custo estimado total", value: `US$ ${totalCost.toFixed(4)}`, icon: DollarSign, color: "bg-amber-500/15 text-amber-400" },
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

      {/* Per-model breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Detalhamento por modelo</h2>
        <div className="bg-[hsl(220,20%,10%)] border border-[hsl(220,15%,15%)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,15%)]">
                <th className="text-left px-5 py-3 text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">Modelo</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">Requisições</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">Tokens</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-[hsl(220,10%,50%)] uppercase tracking-wider">Custo est.</th>
              </tr>
            </thead>
            <tbody>
              {modelStats.map((m) => (
                <tr key={m.model} className="border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,20%,12%)] transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{getModelLabel(m.model)}</td>
                  <td className="px-5 py-3 text-right text-[hsl(220,10%,70%)]">{m.requests.toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 text-right text-[hsl(220,10%,70%)]">{m.tokens.toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 text-right text-amber-400 font-medium">US$ {m.cost.toFixed(4)}</td>
                </tr>
              ))}
              {modelStats.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-[hsl(220,10%,50%)]">Nenhum dado de uso encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAiUsage;
