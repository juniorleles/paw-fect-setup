import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInactiveClients, InactiveClient } from "@/hooks/useInactiveClients";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SendMessageModal from "@/components/inactive-clients/SendMessageModal";
import {
  UserX,
  MessageSquare,
  Loader2,
  TrendingUp,
  Filter,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const InactiveClients = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const [daysThreshold, setDaysThreshold] = useState(30);
  const { clients, loading, potentialRevenue } = useInactiveClients({ daysThreshold });

  const [selectedClient, setSelectedClient] = useState<InactiveClient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [campaignsThisMonth, setCampaignsThisMonth] = useState(0);

  const isEssential = plan === "professional";
  const campaignLimit = isEssential ? 1 : 0;
  const canSendCampaign = isEssential && campaignsThisMonth < campaignLimit;

  // Check campaigns used this month
  useEffect(() => {
    if (!user) return;
    const month = new Date().toISOString().slice(0, 7);
    supabase
      .from("customer_contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("campaign_month", month)
      .then(({ count }) => setCampaignsThisMonth(count ?? 0));
  }, [user]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSendMessage = (client: InactiveClient) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  if (!isEssential) {
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
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="45">45 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <p className="text-xs text-muted-foreground">Potencial de recuperação</p>
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
        <Card className="border-none shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Último atendimento</TableHead>
                  <TableHead className="text-center">Dias sem voltar</TableHead>
                  <TableHead>Serviço mais frequente</TableHead>
                  <TableHead className="text-right">Ticket médio</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.ownerPhone}>
                    <TableCell className="font-medium">{client.ownerName}</TableCell>
                    <TableCell className="font-mono text-sm">{client.ownerPhone}</TableCell>
                    <TableCell>
                      {format(new Date(client.lastAppointmentDate), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={client.daysSinceLastVisit >= 60 ? "destructive" : "secondary"}
                      >
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
                        onClick={() => handleSendMessage(client)}
                        disabled={!canSendCampaign}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Enviar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {selectedClient && (
        <SendMessageModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          clientName={selectedClient.ownerName}
          clientPhone={selectedClient.ownerPhone}
          onSent={() => {
            setCampaignsThisMonth((c) => c + 1);
            setSelectedClient(null);
          }}
        />
      )}
    </div>
  );
};

export default InactiveClients;
