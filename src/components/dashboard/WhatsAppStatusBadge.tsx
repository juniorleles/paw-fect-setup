import { useState } from "react";
import { useWhatsAppStatus, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconnect-whatsapp", {
        method: "POST",
      });
      if (error || data?.error) {
        toast({ title: "Erro ao reconectar", description: data?.error || error?.message, variant: "destructive" });
        return;
      }
      if (data?.qr_code) {
        setQrCode(data.qr_code);
        setQrDialogOpen(true);
      } else {
        toast({ title: "Reconexão iniciada", description: "Aguarde a atualização do status." });
      }
    } catch {
      toast({ title: "Erro ao reconectar", variant: "destructive" });
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
          <Smartphone className={`w-4 h-4 ${config.textClass}`} />
          <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
          <span className={`font-medium ${config.textClass}`}>{config.label}</span>
        </div>
        {status === "disconnected" && (
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

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Escaneie o QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Abra o WhatsApp no seu celular, vá em <strong>Dispositivos conectados</strong> e escaneie o código abaixo.
            </p>
            {qrCode && (
              <img
                src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64 rounded-xl border border-border"
              />
            )}
            <p className="text-xs text-muted-foreground">
              O status será atualizado automaticamente ao conectar.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppStatusBadge;
