import { Card, CardContent } from "@/components/ui/card";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Zap, Phone } from "lucide-react";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";

const WhatsAppStatusCard = () => {
  const { user } = useAuth();
  const whatsappStatus = useWhatsAppStatus();
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchPhone = async () => {
      const { data } = await supabase
        .from("pet_shop_configs")
        .select("phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.phone) setPhone(data.phone);
    };
    fetchPhone();
  }, [user]);

  return (
    <Card
      className={`border-none shadow-md overflow-hidden ${
        whatsappStatus === "connected"
          ? "bg-success/5"
          : whatsappStatus === "pending"
          ? "bg-accent/5"
          : "bg-destructive/5"
      }`}
    >
      <CardContent className="py-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                whatsappStatus === "connected"
                  ? "bg-success/15"
                  : whatsappStatus === "pending"
                  ? "bg-accent/15"
                  : "bg-destructive/15"
              }`}
            >
              <Zap
                className={`w-5 h-5 ${
                  whatsappStatus === "connected"
                    ? "text-success"
                    : whatsappStatus === "pending"
                    ? "text-accent"
                    : "text-destructive"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-bold">
                {whatsappStatus === "connected"
                  ? "WhatsApp Conectado"
                  : whatsappStatus === "pending"
                  ? "Aguardando Conexão"
                  : "WhatsApp Desconectado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {whatsappStatus === "connected"
                  ? "Sua secretária está ativa"
                  : "Reconecte para ativar"}
              </p>
            </div>
          </div>
          <span
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              whatsappStatus === "connected"
                ? "bg-success"
                : whatsappStatus === "pending"
                ? "bg-accent animate-pulse"
                : "bg-destructive"
            }`}
          />
        </div>

        {/* Connected phone */}
        {whatsappStatus === "connected" && phone && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10">
            <Phone className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">{phone}</span>
          </div>
        )}

        {/* Reconnect controls */}
        {whatsappStatus !== "connected" && (
          <div className="mt-3">
            <WhatsAppStatusBadge />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppStatusCard;
