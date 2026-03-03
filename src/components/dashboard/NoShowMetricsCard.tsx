import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserX, RefreshCw, TrendingDown, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

const NoShowMetricsCard = () => {
  const { user } = useAuth();
  const [noShowCount, setNoShowCount] = useState(0);
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [loading, setLoading] = useState(true);

  const now = useMemo(() => new Date(), []);
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [noShowRes, recoveredRes, totalRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "no_show")
          .gte("date", monthStart)
          .lte("date", monthEnd),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "no_show")
          .eq("recovery_status", "recovered")
          .gte("date", monthStart)
          .lte("date", monthEnd),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .gte("date", monthStart)
          .lte("date", monthEnd),
      ]);

      setNoShowCount(noShowRes.count ?? 0);
      setRecoveredCount(recoveredRes.count ?? 0);
      setTotalScheduled(totalRes.count ?? 0);
      setLoading(false);
    };

    fetchStats();
  }, [user, monthStart, monthEnd]);

  if (loading || (noShowCount === 0 && recoveredCount === 0)) return null;

  const noShowRate = totalScheduled > 0 ? (noShowCount / totalScheduled) * 100 : 0;
  const recoveryRate = noShowCount > 0 ? (recoveredCount / noShowCount) * 100 : 0;
  const pendingRecovery = noShowCount - recoveredCount;

  return (
    <section>
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
        Recuperação de faltas
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* No-show rate */}
        <Card className={`border-none shadow-md ${noShowRate > 15 ? "ring-1 ring-destructive/30 bg-destructive/5" : "bg-card"}`}>
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <UserX className="w-5 h-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-destructive">{noShowCount}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Faltas no mês
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="text-xs max-w-[220px] p-3">
                      Clientes que não compareceram ao agendamento neste mês. Taxa de falta: {noShowRate.toFixed(1)}% dos agendamentos.
                    </PopoverContent>
                  </Popover>
                </p>
              </div>
            </div>
            <Progress
              value={Math.min(noShowRate, 100)}
              className="h-1.5 [&>div]:bg-destructive"
            />
            <p className="text-[10px] text-muted-foreground">{noShowRate.toFixed(1)}% de {totalScheduled} agendamentos</p>
          </CardContent>
        </Card>

        {/* Recovered */}
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-success">{recoveredCount}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Recuperados
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="text-xs max-w-[220px] p-3">
                      Clientes que faltaram mas remarcaram automaticamente via WhatsApp após a mensagem de recuperação.
                    </PopoverContent>
                  </Popover>
                </p>
              </div>
            </div>
            <Progress
              value={Math.min(recoveryRate, 100)}
              className="h-1.5 [&>div]:bg-success"
            />
            <p className="text-[10px] text-muted-foreground">{recoveryRate.toFixed(0)}% de taxa de recuperação</p>
          </CardContent>
        </Card>

        {/* Pending recovery */}
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold">{Math.max(0, pendingRecovery)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Aguardando resposta
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="text-xs max-w-[220px] p-3">
                      Faltas que já receberam mensagem de recuperação mas o cliente ainda não reagendou.
                    </PopoverContent>
                  </Popover>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default NoShowMetricsCard;
