import { useState } from "react";
import { useWhatsAppStatus, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { Button } from "@/components/ui/button";
import { Smartphone, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<WhatsAppStatus, { label: string; dotClass: string; textClass: string }> = {
  connected: {
    label: "WhatsApp conectado",
    dotClass: "bg-success",
    textClass: "text-success",
  },
  pending: {
    label: "Aguardando conexão",
    dotClass: "bg-accent animate-pulse",
    textClass: "text-accent",
  },
  disconnected: {
    label: "WhatsApp desconectado",
    dotClass: "bg-destructive",
    textClass: "text-destructive",
  },
};

const WhatsAppStatusBadge = () => {
  const status = useWhatsAppStatus();
  const config = STATUS_CONFIG[status];
  const { toast } = useToast();
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconnect-whatsapp", {
        method: "POST",
      });
      if (error || data?.error) {
        toast({ title: "Erro ao reconectar", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Reconexão iniciada", description: "O status será atualizado automaticamente." });
      }
    } catch {
      toast({ title: "Erro ao reconectar", variant: "destructive" });
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
        <Smartphone className={`w-4 h-4 ${config.textClass}`} />
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
        <span className={`font-medium ${config.textClass}`}>{config.label}</span>
      </div>
      {(status === "disconnected" || status === "pending") && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReconnect}
          disabled={reconnecting}
          className="gap-1.5 text-xs"
        >
          {reconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Reconectar
        </Button>
      )}
    </div>
  );
};

export default WhatsAppStatusBadge;
