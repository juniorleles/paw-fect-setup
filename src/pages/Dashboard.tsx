import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingData, INITIAL_DATA } from "@/types/onboarding";
import {
  CalendarDays,
  Clock,
  Scissors,
  TrendingUp,
  Users,
  MessageCircle,
  Bot,
  Loader2,
  PawPrint,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const MOCK_APPOINTMENTS = [
  { id: 1, pet: "Rex", owner: "Maria Silva", service: "Banho", date: "Hoje, 14:00", status: "confirmed" },
  { id: 2, pet: "Luna", owner: "João Santos", service: "Tosa", date: "Hoje, 15:30", status: "confirmed" },
  { id: 3, pet: "Mel", owner: "Ana Costa", service: "Banho e Tosa", date: "Amanhã, 09:00", status: "pending" },
  { id: 4, pet: "Thor", owner: "Carlos Lima", service: "Vacinação", date: "Amanhã, 10:30", status: "pending" },
  { id: 5, pet: "Bella", owner: "Fernanda Dias", service: "Consulta", date: "Amanhã, 14:00", status: "confirmed" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: configs } = await supabase
        .from("pet_shop_configs")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      if (configs && configs.length > 0) {
        const c = configs[0];
        setData({
          phone: c.phone,
          phoneVerified: c.phone_verified,
          shopName: c.shop_name,
          address: c.address,
          neighborhood: c.neighborhood,
          city: c.city,
          state: c.state,
          businessHours: c.business_hours as unknown as OnboardingData["businessHours"],
          services: c.services as unknown as OnboardingData["services"],
          voiceTone: c.voice_tone as OnboardingData["voiceTone"],
          assistantName: c.assistant_name,
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const openDays = data.businessHours.filter((d) => d.isOpen).length;
  const toneLabel = data.voiceTone === "friendly" ? "Amigável" : data.voiceTone === "fun" ? "Divertido" : "Formal";

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <PawPrint className="w-7 h-7 text-primary" />
            {data.shopName || "Meu Pet Shop"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Secretária <span className="font-semibold text-primary">{data.assistantName}</span> está ativa
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/settings")}>
          Editar configurações
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Agendamentos hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">48</p>
                <p className="text-xs text-muted-foreground">Clientes atendidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-xs text-muted-foreground">Mensagens recebidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">R$ 2.4k</p>
                <p className="text-xs text-muted-foreground">Faturamento do mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments */}
        <Card className="border-none shadow-md bg-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_APPOINTMENTS.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <PawPrint className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{apt.pet}</p>
                    <p className="text-xs text-muted-foreground">{apt.owner} · {apt.service}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{apt.date}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      apt.status === "confirmed"
                        ? "bg-success/10 text-success"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {apt.status === "confirmed" ? "Confirmado" : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Config summary */}
        <Card className="border-none shadow-md bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              Sua Secretária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-xl bg-secondary">
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-semibold">{data.assistantName}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary">
              <p className="text-xs text-muted-foreground">WhatsApp</p>
              <p className="font-semibold">{data.phone}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary flex items-start gap-2">
              <Clock className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Funcionamento</p>
                <p className="font-semibold text-sm">{openDays} dias/semana</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary flex items-start gap-2">
              <Scissors className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Serviços</p>
                <p className="font-semibold text-sm">{data.services.length} cadastrados</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary">
              <p className="text-xs text-muted-foreground">Tom de voz</p>
              <p className="font-semibold">{toneLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
