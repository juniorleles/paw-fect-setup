import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerId } from "@/hooks/useOwnerId";
import { useNiche } from "@/hooks/useNiche";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserX, RefreshCw, TrendingDown, Search, CalendarDays, Filter } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NoShowRecord {
  id: string;
  date: string;
  time: string;
  owner_name: string;
  pet_name: string;
  service: string;
  recovery_status: string | null;
  recovery_message_sent_at: string | null;
  no_show_detected_at: string | null;
}

type PeriodFilter = "this_week" | "this_month" | "last_month" | "last_3_months" | "all";
type StatusFilter = "all" | "pending" | "recovered" | "lost" | "no_message";

const NoShowReport = () => {
  const { user } = useAuth();
  const { ownerId } = useOwnerId();
  const { isPetNiche } = useNiche();
  const [records, setRecords] = useState<NoShowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("this_month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const effectiveUserId = ownerId || user?.id;

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "this_week":
        return { from: format(startOfWeek(now, { locale: ptBR }), "yyyy-MM-dd"), to: format(endOfWeek(now, { locale: ptBR }), "yyyy-MM-dd") };
      case "this_month":
        return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
      case "last_month": {
        const last = subMonths(now, 1);
        return { from: format(startOfMonth(last), "yyyy-MM-dd"), to: format(endOfMonth(last), "yyyy-MM-dd") };
      }
      case "last_3_months":
        return { from: format(subMonths(now, 3), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
      case "all":
        return { from: "2020-01-01", to: format(now, "yyyy-MM-dd") };
    }
  }, [period]);

  useEffect(() => {
    if (!effectiveUserId) return;

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("id, date, time, owner_name, pet_name, service, recovery_status, recovery_message_sent_at, no_show_detected_at")
        .eq("user_id", effectiveUserId)
        .eq("status", "no_show")
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date", { ascending: false });

      if (!error && data) setRecords(data);
      setLoading(false);
    };

    fetch();
  }, [effectiveUserId, dateRange]);

  const filtered = useMemo(() => {
    let result = records;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.owner_name.toLowerCase().includes(q) ||
          r.pet_name.toLowerCase().includes(q) ||
          r.service.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((r) => {
        if (statusFilter === "no_message") return !r.recovery_message_sent_at;
        if (statusFilter === "pending") return r.recovery_status === "pending";
        if (statusFilter === "recovered") return r.recovery_status === "recovered";
        if (statusFilter === "lost") return r.recovery_status === "lost";
        return true;
      });
    }

    return result;
  }, [records, search, statusFilter]);

  // Stats
  const totalNoShows = records.length;
  const recovered = records.filter((r) => r.recovery_status === "recovered").length;
  const pending = records.filter((r) => r.recovery_status === "pending").length;
  const lost = records.filter((r) => r.recovery_status === "lost").length;
  const noMessage = records.filter((r) => !r.recovery_message_sent_at).length;
  const recoveryRate = totalNoShows > 0 ? (recovered / totalNoShows) * 100 : 0;

  // Reincidence ranking
  const reincidence = useMemo(() => {
    const map: Record<string, { name: string; count: number; lastDate: string }> = {};
    for (const r of records) {
      const key = r.owner_name.toLowerCase();
      if (!map[key]) {
        map[key] = { name: r.owner_name, count: 0, lastDate: r.date };
      }
      map[key].count++;
      if (r.date > map[key].lastDate) map[key].lastDate = r.date;
    }
    return Object.values(map)
      .filter((v) => v.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [records]);

  const getStatusBadge = (record: NoShowRecord) => {
    if (!record.recovery_message_sent_at) {
      return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Sem mensagem</Badge>;
    }
    switch (record.recovery_status) {
      case "recovered":
        return <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">Recuperado</Badge>;
      case "lost":
        return <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">Perdido</Badge>;
      case "pending":
        return <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20">Aguardando</Badge>;
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Relatório de Faltas</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe as faltas e o desempenho das recuperações automáticas.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-none shadow-md">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <UserX className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{totalNoShows}</p>
                <p className="text-[11px] text-muted-foreground">Faltas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{recovered}</p>
                <p className="text-[11px] text-muted-foreground">Recuperados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-[11px] text-muted-foreground">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recoveryRate.toFixed(0)}%</p>
                <p className="text-[11px] text-muted-foreground">Taxa recuperação</p>
              </div>
            </div>
            <Progress value={Math.min(recoveryRate, 100)} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Reincidence ranking */}
      {reincidence.length > 0 && (
        <Card className="border-none shadow-md">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm font-semibold text-foreground mb-3">⚠️ Clientes reincidentes</p>
            <div className="space-y-2">
              {reincidence.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{r.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      Última: {format(parseISO(r.lastDate), "dd/MM", { locale: ptBR })}
                    </span>
                    <Badge variant="destructive" className="bg-destructive/15 text-destructive text-xs">
                      {r.count} faltas
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, pet ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_week">Esta semana</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
            <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="recovered">Recuperados</SelectItem>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="lost">Perdidos</SelectItem>
            <SelectItem value="no_message">Sem mensagem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Cliente</TableHead>
                {isPetNiche && <TableHead className="hidden sm:table-cell">Pet</TableHead>}
                <TableHead className="hidden md:table-cell">Serviço</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma falta encontrada no período.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(record.date), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{record.time.slice(0, 5)}</TableCell>
                    <TableCell>{record.owner_name}</TableCell>
                    {isPetNiche && <TableCell className="hidden sm:table-cell">{record.pet_name}</TableCell>}
                    <TableCell className="hidden md:table-cell">{record.service}</TableCell>
                    <TableCell>{getStatusBadge(record)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Exibindo {filtered.length} de {totalNoShows} falta(s) no período
        </p>
      )}
    </div>
  );
};

export default NoShowReport;
