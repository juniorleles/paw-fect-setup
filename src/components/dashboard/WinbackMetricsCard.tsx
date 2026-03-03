import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Send, UserCheck, Clock, CalendarClock, Crown, Info, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface StageStats {
  sent: number;
  label: string;
  emoji: string;
}

const WinbackMetricsCard = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [stages, setStages] = useState<Record<string, StageStats>>({
    WINBACK_15: { sent: 0, label: "15 dias", emoji: "💬" },
    WINBACK_30: { sent: 0, label: "30 dias", emoji: "🔥" },
    WINBACK_60: { sent: 0, label: "60 dias", emoji: "💎" },
  });
  const [returnedCount, setReturnedCount] = useState(0);
  const [upsellCount, setUpsellCount] = useState(0);
  const [nextClients, setNextClients] = useState(0);
  const [loading, setLoading] = useState(true);

  const now = useMemo(() => new Date(), []);
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const currentMonth = format(now, "yyyy-MM");

  useEffect(() => {
    if (!user || plan !== "professional") {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      // 1. Fetch winback + upsell campaign logs for this month
      const { data: logs } = await supabase
        .from("inactive_campaign_logs")
        .select("campaign_type, customer_phone")
        .eq("user_id", user.id)
        .eq("campaign_month", currentMonth)
        .in("campaign_type", ["WINBACK_15", "WINBACK_30", "WINBACK_60", "POST_SERVICE_UPSELL"]);

      if (logs) {
        const stageMap = { ...stages };
        let upsellTotal = 0;
        for (const log of logs) {
          if (log.campaign_type === "POST_SERVICE_UPSELL") {
            upsellTotal++;
          } else if (stageMap[log.campaign_type]) {
            stageMap[log.campaign_type].sent++;
          }
        }
        setStages(stageMap);
        setUpsellCount(upsellTotal);

        // 2. Check how many of those clients returned (have a completed appointment after campaign)
        const phones = [...new Set(logs.map((l) => l.customer_phone))];
        if (phones.length > 0) {
          const { count } = await supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("owner_phone", phones)
            .eq("status", "completed")
            .gte("date", monthStart)
            .lte("date", monthEnd);
          setReturnedCount(count ?? 0);
        }
      }

      // 3. Count clients eligible for next wave (inactive 15+ days, no future appt)
      const todayStr = now.toISOString().split("T")[0];
      const threshold = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: completedAppts } = await supabase
        .from("appointments")
        .select("owner_phone, date")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("date", { ascending: false });

      if (completedAppts) {
        const lastByPhone = new Map<string, string>();
        for (const a of completedAppts) {
          if (!a.owner_phone) continue;
          const phone = a.owner_phone.replace(/\D/g, "");
          if (!lastByPhone.has(phone)) lastByPhone.set(phone, a.date);
        }

        const { data: futureAppts } = await supabase
          .from("appointments")
          .select("owner_phone")
          .eq("user_id", user.id)
          .gte("date", todayStr)
          .neq("status", "cancelled")
          .neq("status", "no_show");

        const futurePhones = new Set(
          (futureAppts || []).map((a) => a.owner_phone?.replace(/\D/g, ""))
        );

        let eligible = 0;
        for (const [phone, lastDate] of lastByPhone) {
          if (lastDate <= threshold && !futurePhones.has(phone)) eligible++;
        }
        setNextClients(eligible);
      }

      setLoading(false);
    };

    fetchStats();
  }, [user, plan, currentMonth, monthStart, monthEnd]);

  // Only show for Pro plan users
  if (plan !== "professional" || loading) return null;

  const totalSent = stages.WINBACK_15.sent + stages.WINBACK_30.sent + stages.WINBACK_60.sent;
  const totalAll = totalSent + upsellCount;

  // Don't show if no data and no eligible clients
  if (totalAll === 0 && nextClients === 0) return null;

  const returnRate = totalSent > 0 ? (returnedCount / totalSent) * 100 : 0;

  return (
    <section>
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
        <Crown className="w-4 h-4 text-primary" />
        Campanhas Automáticas
        <Badge variant="secondary" className="text-[10px] font-bold uppercase">Pro</Badge>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total sent */}
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold">{totalAll}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Total enviados
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="text-xs max-w-[250px] p-3">
                      <div className="space-y-1">
                        <p className="font-semibold mb-1">Mensagens por estágio:</p>
                        <p>{stages.WINBACK_15.emoji} 15 dias: {stages.WINBACK_15.sent}</p>
                        <p>{stages.WINBACK_30.emoji} 30 dias: {stages.WINBACK_30.sent}</p>
                        <p>{stages.WINBACK_60.emoji} 60 dias: {stages.WINBACK_60.sent}</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return rate */}
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-success">{returnedCount}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Retornaram
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="text-xs max-w-[220px] p-3">
                      Clientes que receberam mensagem de win-back e agendaram novamente neste mês.
                    </PopoverContent>
                  </Popover>
                </p>
              </div>
            </div>
            {totalSent > 0 && (
              <>
                <Progress
                  value={Math.min(returnRate, 100)}
                  className="h-1.5 [&>div]:bg-success"
                />
                <p className="text-[10px] text-muted-foreground">{returnRate.toFixed(0)}% taxa de retorno</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stage breakdown */}
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Por estágio</p>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(stages).map(([key, stage]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{stage.emoji} {stage.label}</span>
                  <span className="font-bold">{stage.sent}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next wave */}
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarClock className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold">{nextClients}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Próximo envio
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-primary transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="text-xs max-w-[220px] p-3">
                      Clientes inativos há 15+ dias que receberão mensagem automática no próximo ciclo (diário às 10h).
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

export default WinbackMetricsCard;
