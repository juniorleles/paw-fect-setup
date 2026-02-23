import { useState } from "react";
import { useWhatsAppStatus, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { Button } from "@/components/ui/button";
import { Smartphone, RefreshCw, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const isMobile = useIsMobile();
  const [reconnecting, setReconnecting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReconnect = async () => {
    setReconnecting(true);
    setQrCode(null);
    setPairingCode(null);
    setCopied(false);

    try {
      const { data, error } = await supabase.functions.invoke("reconnect-whatsapp", {
        method: "POST",
        body: { mobile: isMobile },
      });

      if (error || data?.error) {
        toast({ title: "Erro ao reconectar", description: data?.error || error?.message, variant: "destructive" });
        return;
      }

      if (data?.pairingCode) {
        setPairingCode(data.pairingCode);
        setDialogOpen(true);
      } else if (data?.qrCode) {
        setQrCode(data.qrCode);
        setDialogOpen(true);
      } else {
        toast({ title: "Reconexão iniciada", description: "O status será atualizado automaticamente." });
      }
    } catch {
      toast({ title: "Erro ao reconectar", variant: "destructive" });
    } finally {
      setReconnecting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close dialog when status changes to connected
  if (status === "connected" && dialogOpen) {
    setDialogOpen(false);
  }

  return (
    <>
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
            {status === "pending" ? "Ver código" : "Reconectar"}
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Conectar WhatsApp</DialogTitle>
            <DialogDescription className="text-center">
              {pairingCode
                ? "Use o código abaixo para conectar seu WhatsApp"
                : "Escaneie o QR Code com seu WhatsApp"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {pairingCode ? (
              <>
                <div className="text-3xl font-mono font-bold tracking-[0.3em] text-center px-4 py-6 rounded-xl bg-secondary">
                  {pairingCode}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar código
                    </>
                  )}
                </Button>
                <div className="text-sm text-muted-foreground text-center space-y-1">
                  <p className="font-semibold">Como conectar:</p>
                  <p>1. Abra o WhatsApp</p>
                  <p>2. Toque em <strong>⋮ → Dispositivos conectados</strong></p>
                  <p>3. Toque em <strong>Conectar dispositivo</strong></p>
                  <p>4. Toque em <strong>Conectar com número de telefone</strong></p>
                  <p>5. Cole o código acima</p>
                </div>
              </>
            ) : qrCode ? (
              <>
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 rounded-xl"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Abra o WhatsApp → <strong>Dispositivos conectados</strong> → Escanear QR Code
                </p>
              </>
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppStatusBadge;
