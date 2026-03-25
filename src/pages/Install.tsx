import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Share, MoreVertical, Plus, ArrowLeft, CheckCircle2, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Install = () => {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const navigate = useNavigate();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6 pb-12">
        <div className="max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm opacity-80 hover:opacity-100 transition-opacity">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">Instalar MagicZap</h1>
              <p className="text-sm opacity-90">Acesse como um app nativo no seu celular</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 pb-10 space-y-6">
        {/* Already installed */}
        {isInstalled && (
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
              <div>
                <p className="font-bold text-foreground">App já instalado!</p>
                <p className="text-sm text-muted-foreground">O MagicZap já está na sua tela inicial.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick install button (Android Chrome) */}
        {canInstall && !isInstalled && (
          <Card className="border-2 border-primary shadow-lg">
            <CardContent className="p-5 space-y-3">
              <p className="font-bold text-lg text-foreground">Instalação rápida</p>
              <p className="text-sm text-muted-foreground">Clique abaixo para instalar o MagicZap diretamente na sua tela inicial.</p>
              <Button onClick={install} className="w-full font-bold" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Instalar MagicZap
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="font-bold text-foreground">✨ Por que instalar?</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Acesso rápido pela tela inicial</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Tela cheia, sem barra do navegador</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Funciona offline (funcionalidades básicas)</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> Experiência de app nativo</li>
            </ul>
          </CardContent>
        </Card>

        {/* iOS Instructions */}
        {(!isAndroid || !canInstall) && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-lg">🍎</div>
                <p className="font-bold text-foreground">iPhone / iPad (Safari)</p>
              </div>

              <div className="space-y-4">
                <Step number={1} title="Abra no Safari">
                  <p className="text-sm text-muted-foreground">
                    Acesse <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">magiczap.io</span> pelo <strong>Safari</strong> (não funciona no Chrome do iPhone).
                  </p>
                </Step>

                <Step number={2} title='Toque em "Compartilhar"'>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <p>Toque no ícone</p>
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                      <Share className="w-4 h-4 text-primary" />
                    </div>
                    <p>na barra inferior do Safari.</p>
                  </div>
                </Step>

                <Step number={3} title='"Adicionar à Tela de Início"'>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <p>Role para baixo e toque em</p>
                    <div className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-lg text-xs font-medium">
                      <Plus className="w-3 h-3" /> Tela de Início
                    </div>
                  </div>
                </Step>

                <Step number={4} title="Confirme">
                  <p className="text-sm text-muted-foreground">
                    Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto! 🎉
                  </p>
                </Step>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions */}
        {(!isIOS || !canInstall) && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-lg">🤖</div>
                <p className="font-bold text-foreground">Android (Chrome)</p>
              </div>

              <div className="space-y-4">
                <Step number={1} title="Abra no Chrome">
                  <p className="text-sm text-muted-foreground">
                    Acesse <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">magiczap.io</span> pelo <strong>Google Chrome</strong>.
                  </p>
                </Step>

                <Step number={2} title="Toque no menu">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <p>Toque nos</p>
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                      <MoreVertical className="w-4 h-4 text-primary" />
                    </div>
                    <p>três pontinhos no canto superior direito.</p>
                  </div>
                </Step>

                <Step number={3} title='"Adicionar à tela inicial"'>
                  <p className="text-sm text-muted-foreground">
                    Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong> no menu.
                  </p>
                </Step>

                <Step number={4} title="Confirme">
                  <p className="text-sm text-muted-foreground">
                    Toque em <strong>"Instalar"</strong>. O ícone aparecerá na sua tela inicial! 🎉
                  </p>
                </Step>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const Step = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
      {number}
    </div>
    <div className="flex-1 pt-0.5">
      <p className="font-semibold text-sm text-foreground mb-1">{title}</p>
      {children}
    </div>
  </div>
);

export default Install;
