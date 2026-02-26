import { useState, useEffect, useCallback, useRef } from "react";
import { useWhatsAppStatus, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { Button } from "@/components/ui/button";
import { Smartphone, RefreshCw, Loader2, Copy, CheckCircle2, Timer, QrCode, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const QR_EXPIRY_SECONDS = 45;

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
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRY_SECONDS);
  const [expired, setExpired] = useState(false);
  const [activeTab, setActiveTab] = useState<"pairing" | "qr">("pairing");
  const [loadingQr, setLoadingQr] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setSecondsLeft(QR_EXPIRY_SECONDS);
    setExpired(false);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  const handleReconnect = async (mode: "pairing" | "qr" = "pairing") => {
    setReconnecting(true);
    setQrCode(null);
    setPairingCode(null);
    setCopied(false);
    setExpired(false);

    try {
      const isMobileMode = mode === "pairing";
      const { data, error } = await supabase.functions.invoke("reconnect-whatsapp", {
        method: "POST",
        body: { mobile: isMobileMode },
      });

      if (error || data?.error) {
        toast({ title: "Erro ao reconectar", description: data?.error || error?.message, variant: "destructive" });
        return;
      }

      if (data?.pairingCode && data.pairingCode.length <= 20) {
        setPairingCode(data.pairingCode);
        setActiveTab("pairing");
        setDialogOpen(true);
        startTimer();
      } else if (data?.qrCode) {
        setQrCode(data.qrCode);
        if (mode === "qr") {
          setActiveTab("qr");
        }
        setDialogOpen(true);
        startTimer();
      } else {
        toast({ title: "Reconexão iniciada", description: "O status será atualizado automaticamente." });
      }
    } catch {
      toast({ title: "Erro ao reconectar", variant: "destructive" });
    } finally {
      setReconnecting(false);
      setLoadingQr(false);
    }
  };

  const handleRequestQr = async () => {
    setLoadingQr(true);
    setQrCode(null);
    try {
      const { data, error } = await supabase.functions.invoke("reconnect-whatsapp", {
        method: "POST",
        body: { mobile: false },
      });
      if (!error && data?.qrCode) {
        setQrCode(data.qrCode);
        startTimer();
      }
    } catch { /* ignore */ }
    finally { setLoadingQr(false); }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "pairing" | "qr");
    if (tab === "qr" && !qrCode) {
      handleRequestQr();
    }
  };

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close dialog when status changes to connected
  useEffect(() => {
    if (status === "connected" && dialogOpen) {
      setDialogOpen(false);
      clearTimer();
      toast({ title: "WhatsApp conectado!", description: "Sua secretária digital está ativa." });
    }
  }, [status, dialogOpen, clearTimer, toast]);

  // Stop timer when dialog closes
  useEffect(() => {
    if (!dialogOpen) clearTimer();
  }, [dialogOpen, clearTimer]);

  const progressPercent = (secondsLeft / QR_EXPIRY_SECONDS) * 100;

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
            onClick={() => handleReconnect()}
            disabled={reconnecting}
            className="gap-1.5 text-xs"
          >
            {reconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {status === "pending" ? "Conectar" : "Reconectar"}
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Conectar WhatsApp</DialogTitle>
            <DialogDescription className="text-center">
              Escolha como deseja conectar seu WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {expired ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Timer className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground text-center">
                  O código expirou
                </p>
                <Button onClick={() => {
                  if (status === "connected") {
                    setDialogOpen(false);
                    clearTimer();
                    toast({ title: "WhatsApp conectado!", description: "Sua secretária digital está ativa." });
                  } else {
                    handleReconnect(activeTab);
                  }
                }} disabled={reconnecting} className="gap-2">
                  {reconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Gerar novo código
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="pairing" className="gap-1.5 text-xs">
                    <Hash className="w-3.5 h-3.5" />
                    Código
                    {isMobile && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground leading-none">
                        Recomendado
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="gap-1.5 text-xs">
                    <QrCode className="w-3.5 h-3.5" />
                    QR Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pairing" className="flex flex-col items-center gap-4 mt-4">
                  {pairingCode ? (
                    <>
                      <div className="text-xl sm:text-3xl font-mono font-bold tracking-[0.15em] sm:tracking-[0.3em] text-center px-3 py-5 rounded-xl bg-secondary break-all">
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
                      <div className="text-sm text-muted-foreground text-center space-y-1 bg-secondary/50 rounded-lg p-3">
                        <p className="font-semibold text-foreground">Como conectar pelo celular:</p>
                        <p>1. Abra o <strong>WhatsApp</strong> no seu celular</p>
                        <p>2. Toque em <strong>⋮ → Dispositivos conectados</strong></p>
                        <p>3. Toque em <strong>Conectar dispositivo</strong></p>
                        <p>4. Toque em <strong>Conectar com número de telefone</strong></p>
                        <p>5. Cole o código acima e confirme</p>
                      </div>
                    </>
                  ) : reconnecting ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Gerando código de pareamento...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <p className="text-sm text-muted-foreground text-center">
                        Clique abaixo para gerar um código de pareamento
                      </p>
                      <Button onClick={() => handleReconnect("pairing")} className="gap-2">
                        <Hash className="w-4 h-4" />
                        Gerar código
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="qr" className="flex flex-col items-center gap-4 mt-4">
                  {qrCode ? (
                    <>
                      <img
                        src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                        alt="QR Code WhatsApp"
                        className="w-56 h-56 sm:w-64 sm:h-64 rounded-xl"
                      />
                      <div className="text-sm text-muted-foreground text-center space-y-1 bg-secondary/50 rounded-lg p-3">
                        <p className="font-semibold text-foreground">Como conectar pelo computador:</p>
                        <p>1. Abra o <strong>WhatsApp</strong> no seu celular</p>
                        <p>2. Toque em <strong>⋮ → Dispositivos conectados</strong></p>
                        <p>3. Toque em <strong>Conectar dispositivo</strong></p>
                        <p>4. Aponte a câmera para o <strong>QR Code</strong> acima</p>
                        <p>5. Aguarde a conexão ser confirmada</p>
                      </div>
                    </>
                  ) : loadingQr ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <p className="text-sm text-muted-foreground text-center">
                        Clique abaixo para gerar um QR Code
                      </p>
                      <Button onClick={handleRequestQr} className="gap-2">
                        <QrCode className="w-4 h-4" />
                        Gerar QR Code
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {/* Device name notice */}
            {!expired && (qrCode || pairingCode) && (
              <div className="w-full text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 text-center">
                <span className="font-medium">ℹ️ Aviso:</span> Após conectar, o dispositivo pode aparecer como <strong>"MacOS"</strong> ou <strong>"Windows"</strong> na lista de dispositivos conectados do seu WhatsApp. Isso é normal e esperado.
              </div>
            )}

            {/* Timer bar */}
            {!expired && (qrCode || pairingCode) && (
              <div className="w-full space-y-1.5">
                <Progress value={progressPercent} className="h-1.5" />
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="w-3 h-3" />
                  <span>Expira em {secondsLeft}s</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppStatusBadge;
