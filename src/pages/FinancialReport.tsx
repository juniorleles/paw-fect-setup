import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerId } from "@/hooks/useOwnerId";
import { DollarSign, TrendingUp, Users, Award, ArrowLeft, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ServiceConfig {
  name: string;
  price: number;
  duration: number;
}

interface AppointmentRow {
  id: string;
  owner_name: string;
  owner_phone: string;
  service: string;
  date: string;
  time: string;
  status: string;
}

interface CampaignLog {
  customer_phone: string;
  customer_name: string;
  campaign_type: string;
  sent_at: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(262, 80%, 60%)",
  "hsl(340, 70%, 55%)",
  "hsl(180, 60%, 45%)",
  "hsl(30, 80%, 55%)",
];

const PERIOD_OPTIONS = [
  { value: "1", label: "Último mês" },
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Último ano" },
];

const FinancialReport = () => {
  const navigate = useNavigate();
  const { ownerId, loading: ownerLoading } = useOwnerId();
  const [period, setPeriod] = useState("3");
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [campaignLogs, setCampaignLogs] = useState<CampaignLog[]>([]);
  const [tableOpen, setTableOpen] = useState(false);

  const dateRange = useMemo(() => {
    const months = parseInt(period);
    const end = new Date();
    const start = startOfMonth(subMonths(end, months - 1));
    return { start, end, startStr: format(start, "yyyy-MM-dd"), endStr: format(end, "yyyy-MM-dd") };
  }, [period]);

  useEffect(() => {
    if (!ownerId || ownerLoading) return;

    const fetchData = async () => {
      setLoading(true);
      const [aptsRes, configRes, logsRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, owner_name, owner_phone, service, date, time, status")
          .eq("user_id", ownerId)
          .eq("status", "completed")
          .gte("date", dateRange.startStr)
          .lte("date", dateRange.endStr)
          .order("date", { ascending: false }),
        supabase
          .from("pet_shop_configs")
          .select("services")
          .eq("user_id", ownerId)
          .maybeSingle(),
        supabase
          .from("inactive_campaign_logs")
          .select("customer_phone, customer_name, campaign_type, sent_at")
          .eq("user_id", ownerId)
          .gte("sent_at", dateRange.start.toISOString()),
      ]);

      setAppointments((aptsRes.data as AppointmentRow[]) || []);
      setServices(((configRes.data?.services as any) || []) as ServiceConfig[]);
      setCampaignLogs((logsRes.data as CampaignLog[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [ownerId, ownerLoading, dateRange]);

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    services.forEach((s) => {
      map[s.name] = s.price || 0;
    });
    return map;
  }, [services]);

  // --- Metrics ---
  const totalRevenue = useMemo(
    () => appointments.reduce((sum, a) => sum + (priceMap[a.service] || 0), 0),
    [appointments, priceMap]
  );

  const totalAppointments = appointments.length;

  // Ticket médio por cliente
  const clientMetrics = useMemo(() => {
    const clientMap = new Map<string, { name: string; total: number; count: number }>();
    for (const a of appointments) {
      const phone = a.owner_phone?.replace(/\D/g, "") || a.owner_name;
      const existing = clientMap.get(phone) || { name: a.owner_name, total: 0, count: 0 };
      existing.total += priceMap[a.service] || 0;
      existing.count += 1;
      clientMap.set(phone, existing);
    }
    const clients = Array.from(clientMap.values());
    const avgTicket = clients.length > 0 ? clients.reduce((s, c) => s + c.total / c.count, 0) / clients.length : 0;
    const topClients = clients.sort((a, b) => b.total - a.total).slice(0, 10);
    return { avgTicket, topClients, uniqueClients: clients.length };
  }, [appointments, priceMap]);

  // Ranking de serviços
  const serviceRanking = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const a of appointments) {
      const existing = map.get(a.service) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += priceMap[a.service] || 0;
      map.set(a.service, existing);
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [appointments, priceMap]);

  // Receita recuperada por campanhas
  const recoveredRevenue = useMemo(() => {
    const campaignPhones = new Set(campaignLogs.map((l) => l.customer_phone.replace(/\D/g, "")));
    const recovered = appointments.filter((a) => {
      const phone = a.owner_phone?.replace(/\D/g, "");
      return phone && campaignPhones.has(phone);
    });
    const total = recovered.reduce((sum, a) => sum + (priceMap[a.service] || 0), 0);
    return { total, count: recovered.length };
  }, [appointments, campaignLogs, priceMap]);

  // Gráfico mensal de faturamento
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    const months = parseInt(period);
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      map.set(key, 0);
    }
    for (const a of appointments) {
      const key = a.date.substring(0, 7);
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + (priceMap[a.service] || 0));
      }
    }
    return Array.from(map.entries()).map(([month, value]) => ({
      month: format(new Date(month + "-01"), "MMM/yy", { locale: ptBR }),
      value,
    }));
  }, [appointments, priceMap, period]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Relatório Financeiro</h1>
            <p className="text-sm text-muted-foreground">Visão geral do faturamento da sua barbearia</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Faturamento Estimado</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{totalAppointments} atendimentos concluídos</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket Médio</span>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(clientMetrics.avgTicket)}</p>
                <p className="text-xs text-muted-foreground mt-1">{clientMetrics.uniqueClients} clientes únicos</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receita Recuperada</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(recoveredRevenue.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{recoveredRevenue.count} atendimentos via campanhas</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Serviço Top</span>
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold truncate">{serviceRanking[0]?.name || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {serviceRanking[0] ? `${serviceRanking[0].count}x • ${formatCurrency(serviceRanking[0].revenue)}` : "Sem dados"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue over time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Evolução do Faturamento</CardTitle>
                <CardDescription className="text-xs">Faturamento mensal estimado no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Service ranking pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ranking de Serviços</CardTitle>
                <CardDescription className="text-xs">Distribuição de receita por serviço</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center">
                  {serviceRanking.length > 0 ? (
                    <div className="flex w-full gap-4 items-center">
                      <div className="w-1/2 h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={serviceRanking.slice(0, 6)}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              dataKey="revenue"
                              nameKey="name"
                            >
                              {serviceRanking.slice(0, 6).map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [formatCurrency(value), "Receita"]}
                              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-1.5">
                        {serviceRanking.slice(0, 6).map((s, i) => (
                          <div key={s.name} className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="truncate flex-1">{s.name}</span>
                            <span className="text-muted-foreground font-mono">{s.count}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mx-auto">Sem dados no período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clients */}
          {clientMetrics.topClients.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top 10 Clientes por Receita</CardTitle>
                <CardDescription className="text-xs">Clientes que mais geraram faturamento no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {clientMetrics.topClients.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.count} atendimento{c.count > 1 ? "s" : ""}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Table */}
          <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
                  <div>
                    <CardTitle className="text-sm text-left">Atendimentos Detalhados</CardTitle>
                    <CardDescription className="text-xs text-left">{appointments.length} atendimentos concluídos no período</CardDescription>
                  </div>
                  {tableOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Data</TableHead>
                          <TableHead className="text-xs">Horário</TableHead>
                          <TableHead className="text-xs">Cliente</TableHead>
                          <TableHead className="text-xs">Serviço</TableHead>
                          <TableHead className="text-xs text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.slice(0, 100).map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="text-xs">{format(new Date(a.date + "T12:00:00"), "dd/MM/yy")}</TableCell>
                            <TableCell className="text-xs">{a.time?.substring(0, 5)}</TableCell>
                            <TableCell className="text-xs font-medium truncate max-w-[120px]">{a.owner_name}</TableCell>
                            <TableCell className="text-xs">{a.service}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{formatCurrency(priceMap[a.service] || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {appointments.length > 100 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Exibindo os 100 mais recentes de {appointments.length}</p>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}
    </div>
  );
};

export default FinancialReport;
