import { useEffect, useState } from "react";
import { supabaseAdmin as supabase } from "@/integrations/supabase/adminClient";
import { Loader2, Unlock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BlockedUser {
  user_id: string;
  clientName: string;
  email: string;
  trial_end_at: string | null;
  status: string;
  days_overdue: number;
  blocked_messages: number;
}

const AdminBlocked = () => {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [extendDialog, setExtendDialog] = useState<BlockedUser | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const [extending, setExtending] = useState(false);
  const { toast } = useToast();

  const fetchBlocked = async () => {
    setLoading(true);
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id, trial_end_at, status")
      .in("status", ["active", "expired"])
      .not("trial_end_at", "is", null);

    if (!subs) { setLoading(false); return; }

    const now = new Date();
    const blockedSubs = subs.filter((s) => {
      if (!s.trial_end_at) return false;
      const trialEnd = new Date(s.trial_end_at);
      // Trial ended AND no paid subscription (status not reflecting paid)
      return trialEnd < now && differenceInDays(now, trialEnd) > 0;
    });

    if (blockedSubs.length === 0) { setUsers([]); setLoading(false); return; }

    const userIds = blockedSubs.map((s) => s.user_id);
    const [configsRes, logsRes] = await Promise.all([
      supabase
        .from("pet_shop_configs")
        .select("user_id, shop_name, phone")
        .in("user_id", userIds),
      supabase
        .from("admin_error_logs")
        .select("user_id")
        .eq("error_message", "[TRIAL-BLOCK] Mensagem bloqueada — assinatura inativa")
        .in("user_id", userIds),
    ]);

    const configs = configsRes.data;
    const logs = logsRes.data;

    const nameMap = new Map((configs ?? []).map((c) => [c.user_id, { name: c.shop_name, phone: c.phone }]));
    
    // Count blocked messages per user
    const blockCountMap = new Map<string, number>();
    (logs ?? []).forEach((l) => {
      blockCountMap.set(l.user_id!, (blockCountMap.get(l.user_id!) || 0) + 1);
    });

    const merged: BlockedUser[] = blockedSubs.map((s) => ({
      user_id: s.user_id,
      clientName: nameMap.get(s.user_id)?.name ?? "Sem nome",
      email: nameMap.get(s.user_id)?.phone ?? "",
      trial_end_at: s.trial_end_at,
      status: s.status,
      days_overdue: differenceInDays(now, new Date(s.trial_end_at!)),
      blocked_messages: blockCountMap.get(s.user_id) || 0,
    }));

    // Sort by most overdue first
    merged.sort((a, b) => b.days_overdue - a.days_overdue);
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchBlocked(); }, []);

  const handleExtendTrial = async () => {
    if (!extendDialog) return;
    setExtending(true);
    try {
      const newTrialEnd = addDays(new Date(), extendDays).toISOString();
      const { error } = await supabase
        .from("subscriptions")
        .update({ trial_end_at: newTrialEnd, status: "active" })
        .eq("user_id", extendDialog.user_id);

      if (error) throw error;

      toast({ title: "Trial estendido!", description: `+${extendDays} dias para ${extendDialog.clientName}` });
      setExtendDialog(null);
      fetchBlocked();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setExtending(false);
    }
  };

  const statusBadge = (daysOver: number) => {
    if (daysOver > 3) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">Bloqueado</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/15 text-orange-400">Grace period</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários Bloqueados / Expirados</h1>
        <p className="text-sm text-[hsl(220,10%,50%)]">{users.length} usuários com trial expirado</p>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 text-[hsl(220,10%,45%)]">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum usuário bloqueado no momento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[hsl(220,15%,15%)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(220,20%,10%)] text-[hsl(220,10%,50%)] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Trial expirou em</th>
                <th className="text-left px-4 py-3 font-medium">Dias vencidos</th>
                <th className="text-left px-4 py-3 font-medium">Msgs bloqueadas</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(220,15%,15%)]">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-[hsl(220,20%,11%)] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{u.clientName}</td>
                  <td className="px-4 py-3 text-[hsl(220,10%,55%)]">
                    {u.trial_end_at ? format(new Date(u.trial_end_at), "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-red-400">{u.days_overdue} dias</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${u.blocked_messages > 0 ? "text-orange-400" : "text-[hsl(220,10%,45%)]"}`}>
                      {u.blocked_messages}
                    </span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(u.days_overdue)}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                      onClick={() => { setExtendDialog(u); setExtendDays(7); }}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Estender trial
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Extend dialog */}
      <Dialog open={!!extendDialog} onOpenChange={() => setExtendDialog(null)}>
        <DialogContent className="bg-[hsl(220,20%,10%)] border-[hsl(220,15%,18%)] text-white">
          <DialogHeader>
            <DialogTitle>Estender trial</DialogTitle>
            <DialogDescription className="text-[hsl(220,10%,50%)]">
              Adicionar dias extras ao trial de <strong className="text-white">{extendDialog?.clientName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-[hsl(220,10%,65%)]">Quantos dias?</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="bg-[hsl(220,20%,13%)] border-[hsl(220,15%,18%)] text-white"
            />
            <p className="text-xs text-[hsl(220,10%,45%)]">
              O novo trial vai até {format(addDays(new Date(), extendDays), "dd/MM/yyyy")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(null)} className="border-[hsl(220,15%,18%)] text-[hsl(220,10%,65%)]">
              Cancelar
            </Button>
            <Button onClick={handleExtendTrial} disabled={extending} className="bg-blue-600 hover:bg-blue-700">
              {extending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Estender {extendDays} dias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlocked;
