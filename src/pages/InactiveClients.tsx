import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useInactiveClients, InactiveClient } from "@/hooks/useInactiveClients";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SendMessageModal from "@/components/inactive-clients/SendMessageModal";
import {
  UserX, MessageSquare, Loader2, TrendingUp, Filter, Crown, AlertTriangle, Send,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 15;

const InactiveClients = () => {
  const { user } = useAuth();
  const { plan, trialMessagesUsed, trialMessagesLimit } = useSubscription();
  const navigate = useNavigate();
  const [daysThreshold, setDaysThreshold] = useState(30);
  const { clients, loading, potentialRevenue } = useInactiveClients({ daysThreshold });

  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [campaignsThisMonth, setCampaignsThisMonth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const isPaidPlan = plan === "starter" || plan === "professional";
  const campaignLimit = isPaidPlan ? (plan === "professional" ? 999 : 1) : 0;
  const canSendCampaign = isPaidPlan && campaignsThisMonth < campaignLimit;
  const remainingMessages = Math.max(0, trialMessagesLimit - trialMessagesUsed);

  // Check campaigns used this month
  useEffect(() => {
    if (!user) return;
    const month = new Date().toISOString().slice(0, 7);
    supabase
      .from("inactive_campaign_logs" as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("campaign_month", month)
      .then(({ count }: any) => setCampaignsThisMonth(count ?? 0));
  }, [user]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(clients.length / ITEMS_PER_PAGE));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return clients.slice(start, start + ITEMS_PER_PAGE);
  }, [clients, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [daysThreshold]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getDaysBadge = (days: number) => {
    if (days >= 90) return { variant: "destructive" as const, className: "bg-red-500/90 text-white" };
    if (days >= 60) return { variant: "secondary" as const, className: "bg-orange-500/90 text-white" };
    return { variant: "secondary" as const, className: "bg-yellow-500/90 text-white" };
  };

  // Selection logic
  const toggleSelect = (phone: string) => {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPhones.size === clients.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(clients.map((c) => c.ownerPhone)));
    }
  };

  const selectedClients = useMemo(
    () => clients.filter((c) => selectedPhones.has(c.ownerPhone)),
    [clients, selectedPhones]
  );

  const handleSendSingle = (client: InactiveClient) => {
    setSelectedPhones(new Set([client.ownerPhone]));
    setModalOpen(true);
  };

  const handleSendBulk = () => {
    if (selectedPhones.size === 0) return;
    setModalOpen(true);
  };

  const handleSent = (count: number) => {
    if (count > 0) {
      setCampaignsThisMonth((c) => c + 1);
    }
    setSelectedPhones(new Set());
  };

  if (!isPaidPlan) {
    return (
      <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto">
        <Card className="border-none shadow-lg">
          <CardContent className="py-12 text-center space-y-4">
            <Crown className="w-12 h-12 mx-auto text-accent" />
            <h2 className="text-xl font-bold">Recurso do Plano Essencial</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              A lista de clientes inativos está disponível a partir do plano Essencial.
              Recupere clientes que não voltam há semanas e aumente seu faturamento.
            </p>
            <Button onClick={() => navigate("/my-account")} className="gap-2">
              <Crown className="w-4 h-4" />
              Fazer upgrade
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <UserX className="w-6 h-6 text-destructive" />
            Clientes Inativos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clientes que não agendam há mais de {daysThreshold} dias
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              value={String(daysThreshold)}
              onValueChange={(v) => setDaysThreshold(Number(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30+ dias</SelectItem>
                <SelectItem value="45">45+ dias</SelectItem>
                <SelectItem value="60">60+ dias</SelectItem>
                <SelectItem value="90">90+ dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedPhones.size > 0 && canSendCampaign && (
            <Button onClick={handleSendBulk} className="gap-2" size="sm">
              <Send className="w-4 h-4" />
              Enviar para {selectedPhones.size}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="border-none shadow-md bg-card">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <UserX className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "..." : clients.length}</p>
                <p className="text-xs text-muted-foreground">Clientes inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? "..." : formatCurrency(potentialRevenue)}</p>
                <p className="text-xs text-muted-foreground">Potencial recuperação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaignsThisMonth}/{campaignLimit}</p>
                <p className="text-xs text-muted-foreground">Campanhas este mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Send className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{remainingMessages}</p>
                <p className="text-xs text-muted-foreground">Msgs restantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!canSendCampaign && campaignsThisMonth > 0 && (
        <Card className="border-none shadow-md bg-accent/5 ring-1 ring-accent/20">
          <CardContent className="py-3 px-5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Você já utilizou sua campanha mensal. No plano <strong>Pro</strong> você tem campanhas ilimitadas e automação.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <Card className="border-none shadow-md">
          <CardContent className="py-12 text-center">
            <UserX className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum cliente inativo com mais de {daysThreshold} dias</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-none shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedPhones.size === clients.length && clients.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Último atendimento</TableHead>
                    <TableHead className="text-center">Inatividade</TableHead>
                    <TableHead>Último serviço</TableHead>
                    <TableHead className="text-right">Ticket médio</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client) => {
                    const badgeStyle = getDaysBadge(client.daysSinceLastVisit);
                    return (
                      <TableRow
                        key={client.ownerPhone}
                        className={client.daysSinceLastVisit >= 60 ? "bg-destructive/3" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedPhones.has(client.ownerPhone)}
                            onCheckedChange={() => toggleSelect(client.ownerPhone)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{client.ownerName}</TableCell>
                        <TableCell className="font-mono text-sm">{client.ownerPhone}</TableCell>
                        <TableCell>
                          {format(new Date(client.lastAppointmentDate), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={badgeStyle.className}>
                            {client.daysSinceLastVisit}d
                          </Badge>
                        </TableCell>
                        <TableCell>{client.mostFrequentService}</TableCell>
                        <TableCell className="text-right">{formatCurrency(client.avgTicket)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleSendSingle(client)}
                            disabled={!canSendCampaign}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Enviar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      {modalOpen && selectedClients.length > 0 && (
        <SendMessageModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          clients={selectedClients}
          onSent={handleSent}
        />
      )}
    </div>
  );
};

export default InactiveClients;
