import { useState, useEffect, useCallback, useRef } from "react";
import { useWhatsAppStatus, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { Button } from "@/components/ui/button";
import { Smartphone, Loader2, QrCode, AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  const { status } = useWhatsAppStatus();
  const config = STATUS_CONFIG[status];
  const { toast } = useToast();
  const { user } = useAuth();

  const [connecting, setConnecting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const pollRef = useRef<number | null>(null);

  // Check if phone is verified before allowing connect
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("pet_shop_configs")
      .select("phone_verified, phone")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          const digits = (data.phone || "").replace(/\D/g, "");
          setPhoneVerified(data.phone_verified && digits.length === 11);
        }
      });
  }, [user?.id]);

  // Auto-close modal on connect, poll status while QR is open
  useEffect(() => {
    if (status === "connected" && qrOpen) {
      toast({ title: "WhatsApp conectado!", description: "Sua secretária digital está ativa." });
      setQrOpen(false);
      setQrCode(null);
    }
  }, [status, qrOpen, toast]);

  // Poll for new QR every 25s while modal is open (Evolution rotates QR ~30s)
  useEffect(() => {
    if (!qrOpen) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = window.setInterval(() => {
      requestQrCode(true);
    }, 25_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen]);

  const requestQrCode = useCallback(async (silent = false) => {
    if (!silent) setConnecting(true);
    else setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconnect-whatsapp", {
        method: "POST",
        body: {},
      });
      if (error || data?.error) {
        toast({
          title: "Erro ao conectar",
          description: data?.error || error?.message || "Tente novamente.",
          variant: "destructive",
        });
        if (!silent) setQrOpen(false);
        return;
      }
      if (data?.status === "connected") {
        toast({ title: "WhatsApp já estava conectado!" });
        setQrOpen(false);
        return;
      }
      if (data?.qrcode) {
        setQrCode(data.qrcode);
        if (!silent) setQrOpen(true);
      }
    } catch (e: any) {
      toast({
        title: "Erro ao conectar",
        description: e?.message || "Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Normalize QR (Evolution may return raw base64 or data URL)
  const qrImageSrc = qrCode
    ? qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`
    : null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm">
        <Smartphone className={`w-4 h-4 ${config.textClass}`} />
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
        <span className={`font-medium ${config.textClass}`}>{config.label}</span>
      </div>
      {(status === "disconnected" || status === "pending") && (
        phoneVerified === false ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Verifique seu telefone nas configurações antes de conectar</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => requestQrCode(false)}
            disabled={connecting || phoneVerified === null}
            className="gap-1.5 text-xs"
          >
            {connecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <QrCode className="w-3.5 h-3.5" />
            )}
            Conectar via QR Code
          </Button>
        )
      )}

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no seu celular e escaneie o código abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-xs text-muted-foreground space-y-1 bg-secondary/50 rounded-md p-3">
              <p className="font-semibold text-foreground">Como escanear:</p>
              <p>1. Abra o WhatsApp no seu celular</p>
              <p>2. Toque em <strong>Menu (⋮)</strong> → <strong>Aparelhos conectados</strong></p>
              <p>3. Toque em <strong>Conectar um aparelho</strong></p>
              <p>4. Aponte a câmera para este código</p>
            </div>

            <div className="flex items-center justify-center bg-white rounded-lg p-4 border">
              {qrImageSrc ? (
                <img
                  src={qrImageSrc}
                  alt="QR Code do WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Recomendações de segurança:</p>
                <p>Use um número limpo, com pelo menos 6 meses de uso pessoal. Evite envio em massa para contatos que não salvaram seu número.</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => requestQrCode(true)}
              disabled={refreshing}
              className="w-full gap-1.5"
            >
              {refreshing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Atualizar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppStatusBadge;
