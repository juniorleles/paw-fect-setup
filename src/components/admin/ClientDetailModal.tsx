import { useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageSquare, CreditCard, X } from "lucide-react";
import { format } from "date-fns";

interface ClientDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    user_id: string;
    shop_name: string;
    plan: string;
    subStatus: string;
    trialDaysLeft: number | null;
    messages: number;
    whatsapp_status: string;
    phone: string;
    niche: string;
    city: string;
    state: string;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  description: string;
  paid_at: string | null;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  role: string;
  phone: string;
  created_at: string;
}

const ClientDetailModal = ({ open, onOpenChange, client }: ClientDetailModalProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payments" | "messages">("payments");

  useEffect(() => {
    if (!open || !client) return;
    setLoading(true);
    setActiveTab("payments");

    const fetchData = async () => {
      const [paymentsRes, messagesRes] = await Promise.all([
        supabase
          .from("payment_history")
          .select("*")
          .eq("user_id", client.user_id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("conversation_messages")
          .select("*")
          .eq("user_id", client.user_id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      setPayments(paymentsRes.data ?? []);
      setMessages(messagesRes.data ?? []);
      setLoading(false);
    };

    fetchData();
  }, [open, client]);

  if (!client) return null;

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400",
    cancelled: "bg-red-500/15 text-red-400",
    expired: "bg-orange-500/15 text-orange-400",
  };

  const paymentStatusColor: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-400",
    declined: "bg-red-500/15 text-red-400",
    overdue: "bg-orange-500/15 text-orange-400",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[hsl(220,20%,8%)] border-[hsl(220,15%,15%)] text-white p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[hsl(220,15%,15%)]">
          <DialogTitle className="text-lg font-semibold text-white">
            {client.shop_name}
          </DialogTitle>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-[hsl(220,10%,55%)]">
            <span>{client.niche}</span>
            <span>•</span>
            <span>{client.city}/{client.state}</span>
            <span>•</span>
            <span>{client.phone}</span>
          </div>
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-[hsl(220,15%,15%)]">
          <div className="rounded-lg bg-[hsl(220,20%,11%)] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,45%)]">Plano</p>
            <p className="text-sm font-medium mt-1 capitalize">{client.plan}</p>
          </div>
          <div className="rounded-lg bg-[hsl(220,20%,11%)] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,45%)]">Status</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[client.subStatus] ?? "bg-[hsl(220,15%,18%)] text-[hsl(220,10%,55%)]"}`}>
              {client.subStatus}
            </span>
          </div>
          <div className="rounded-lg bg-[hsl(220,20%,11%)] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,45%)]">Trial</p>
            <p className="text-sm font-medium mt-1">{client.trialDaysLeft !== null ? `${client.trialDaysLeft}d` : "—"}</p>
          </div>
          <div className="rounded-lg bg-[hsl(220,20%,11%)] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,45%)]">WhatsApp</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${client.whatsapp_status === "connected" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
              {client.whatsapp_status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-2">
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "payments" ? "bg-blue-600 text-white" : "text-[hsl(220,10%,55%)] hover:text-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Pagamentos ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "messages" ? "bg-blue-600 text-white" : "text-[hsl(220,10%,55%)] hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Mensagens ({messages.length})
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : activeTab === "payments" ? (
            payments.length === 0 ? (
              <p className="text-center py-8 text-[hsl(220,10%,40%)] text-sm">Nenhum pagamento encontrado</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[hsl(220,10%,45%)] text-xs uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">Descrição</th>
                    <th className="text-left py-2 font-medium">Valor</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(220,15%,15%)]">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 text-white">{p.description}</td>
                      <td className="py-2.5 text-[hsl(220,10%,65%)]">
                        {Number(p.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusColor[p.status] ?? "bg-[hsl(220,15%,18%)] text-[hsl(220,10%,55%)]"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-[hsl(220,10%,55%)]">
                        {p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            messages.length === 0 ? (
              <p className="text-center py-8 text-[hsl(220,10%,40%)] text-sm">Nenhuma mensagem encontrada</p>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg p-3 text-sm ${
                      m.role === "assistant"
                        ? "bg-blue-600/10 border border-blue-500/20"
                        : "bg-[hsl(220,20%,12%)] border border-[hsl(220,15%,18%)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-[hsl(220,10%,45%)]">
                        {m.role === "assistant" ? "IA" : m.phone}
                      </span>
                      <span className="text-[10px] text-[hsl(220,10%,40%)]">
                        {format(new Date(m.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>
                    <p className="text-[hsl(220,10%,75%)] whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailModal;
