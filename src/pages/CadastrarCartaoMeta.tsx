import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    n: 1,
    title: "Acesse o Meta Business Manager",
    body: (
      <>
        Abra o link abaixo em uma nova aba e faça login com a mesma conta do
        Facebook que você usou para conectar o WhatsApp ao MagicZap.
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-3 gap-2"
        >
          <a
            href="https://business.facebook.com/billing_hub/payment_settings"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir Meta Business Manager
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      </>
    ),
  },
  {
    n: 2,
    title: "Vá em Cobrança e pagamentos",
    body: (
      <>
        No menu lateral esquerdo, clique em{" "}
        <strong>Cobrança e pagamentos</strong>.
      </>
    ),
  },
  {
    n: 3,
    title: "Selecione a aba Contas do WhatsApp Business",
    body: (
      <>
        Você verá duas abas: <strong>Contas de anúncios</strong> e{" "}
        <strong>Contas do WhatsApp Business</strong>. Clique na segunda.
      </>
    ),
  },
  {
    n: 4,
    title: "Clique em Adicionar forma de pagamento",
    body: (
      <>
        Localize a sua conta WhatsApp na lista (geralmente leva o nome do seu
        negócio) e clique em <strong>Adicionar forma de pagamento</strong>.
      </>
    ),
  },
  {
    n: 5,
    title: "Cadastre o cartão de crédito",
    body: (
      <>
        Insira os dados do seu cartão de crédito (Visa, Mastercard, Elo ou
        American Express). A Meta aceita cartões em <strong>Reais (BRL)</strong>{" "}
        e <strong>Dólar (USD)</strong>. Recomendamos manter em USD para evitar
        IOF em algumas operações.
      </>
    ),
  },
  {
    n: 6,
    title: "Pronto! Lembretes e campanhas serão enviados normalmente",
    body: (
      <>
        Assim que o cartão for confirmado, o MagicZap começa a enviar
        automaticamente os lembretes de 24h e 3h, mensagens de confirmação e
        campanhas de reativação. <strong>Não precisa fazer mais nada aqui.</strong>
      </>
    ),
  },
];

const CadastrarCartaoMeta = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard")}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao painel
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <CreditCard className="w-3.5 h-3.5" />
          Tutorial · 2 minutos
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Como cadastrar um cartão na Meta
        </h1>
        <p className="text-muted-foreground">
          Para enviar lembretes automáticos de agendamento, mensagens de
          confirmação e campanhas de reativação pelo WhatsApp, a Meta exige um
          cartão de crédito cadastrado na sua conta WhatsApp Business.
        </p>
      </div>

      {/* Why */}
      <Card className="border-none shadow-md bg-muted/30">
        <CardContent className="py-5 px-5">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">
                Por que preciso cadastrar um cartão?
              </p>
              <p className="text-muted-foreground">
                A IA do MagicZap responde mensagens dos seus clientes{" "}
                <strong>gratuitamente</strong> (até 1.000 conversas/mês).
                Mensagens iniciadas pelo sistema — como{" "}
                <strong>lembretes 24h antes</strong>,{" "}
                <strong>confirmações</strong> e{" "}
                <strong>reativação de clientes inativos</strong> — são cobradas
                pela Meta a cerca de R$ 0,07–0,12 cada e exigem um cartão
                cadastrado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((s) => (
          <Card key={s.n} className="border-none shadow-md">
            <CardContent className="py-5 px-5">
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {s.n}
                </div>
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="font-bold text-foreground">{s.title}</p>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {s.body}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Done */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
        <CardContent className="py-5 px-5">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-bold text-foreground">
                Já cadastrei o cartão. E agora?
              </p>
              <p className="text-sm text-muted-foreground">
                Não precisa fazer nada no MagicZap. Assim que a Meta confirmar
                o cartão (geralmente em alguns minutos), os lembretes e
                campanhas começam a sair automaticamente nos horários
                programados.
              </p>
              <Button
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="mt-2"
              >
                Voltar ao painel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="border border-border/50 bg-card/50">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">
                Travou em algum passo?{" "}
              </span>
              <a
                href="https://wa.me/5511980912272"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                Fale com a gente no WhatsApp
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastrarCartaoMeta;
