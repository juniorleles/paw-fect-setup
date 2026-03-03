import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, TrendingUp, ArrowRight } from "lucide-react";
import { useInactiveClients } from "@/hooks/useInactiveClients";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

const InactiveClientsCard = () => {
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const isEssential = plan === "professional";
  const { clients, loading, potentialRevenue } = useInactiveClients({ daysThreshold: 30 });

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!isEssential) return null;

  return (
    <Card className="border-none shadow-md bg-card">
      <CardContent className="py-5 px-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <UserX className="w-4 h-4 text-destructive" />
            Clientes Inativos
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/inactive-clients")}
            className="gap-1 text-xs"
          >
            Ver todos
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-destructive">
              {loading ? "..." : clients.length}
            </p>
            <p className="text-xs text-muted-foreground">Clientes inativos (30d+)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">
              {loading ? "..." : formatCurrency(potentialRevenue)}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Potencial de faturamento
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InactiveClientsCard;
