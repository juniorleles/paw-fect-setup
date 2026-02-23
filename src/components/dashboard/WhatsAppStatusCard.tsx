import { Card, CardContent } from "@/components/ui/card";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Zap, Phone, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import WhatsAppStatusBadge from "./WhatsAppStatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const WhatsAppStatusCard = () => {
  const { user } = useAuth();
  const whatsappStatus = useWhatsAppStatus();
  const [phone, setPhone] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

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

  const handleDisconnect = async () => {
    if (!user) return;
    setDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconnect-whatsapp", {
        method: "POST",
        body: { disconnect: true },
      });
      if (error || data?.error) {
        toast({ title: "Erro ao desconectar", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "WhatsApp desconectado com sucesso" });
      }
    } catch {
      toast({ title: "Erro ao desconectar", variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

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
          <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-success/10">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">{phone}</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disconnecting}
                  className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                >
                  {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Desconectar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sua secretária digital ficará inativa e não responderá mensagens até que você reconecte.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Desconectar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
