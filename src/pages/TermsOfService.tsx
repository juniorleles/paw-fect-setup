import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleClose = () => {
    // Try to close the tab; if blocked by browser, fallback to navigating back
    window.close();
    // If window.close() didn't work (browser restriction), navigate back
    setTimeout(() => {
      navigate("/onboarding", { state: { step: 6 } });
    }, 100);
  };

  return (
  <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
        <h1 className="text-lg font-display font-bold text-foreground">Termos de Uso</h1>
        <Button variant="outline" size="sm" className="ml-auto" onClick={handleClose}>
          Fechar
        </Button>
      </div>
    </header>

    <main className="max-w-4xl mx-auto px-4 py-12">
      <article className="prose prose-sm sm:prose max-w-none text-foreground space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Termos de Uso</h1>
          <p className="text-muted-foreground text-sm">Última atualização: 25 de fevereiro de 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">1. Aceitação dos Termos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ao acessar ou utilizar a plataforma MagicZap ("Plataforma"), você concorda integralmente com estes Termos de Uso ("Termos"). Caso não concorde com qualquer disposição, não utilize a Plataforma. O uso continuado após eventuais alterações constitui aceitação das novas condições.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">2. Definição do Serviço</h2>
          <p className="text-muted-foreground leading-relaxed">
            A MagicZap é uma plataforma SaaS de automação inteligente de mensagens via WhatsApp, utilizando inteligência artificial para otimizar o atendimento, agendamento e comunicação de pequenas e médias empresas. O serviço inclui funcionalidades como assistente virtual com IA, gestão de agendamentos, envio automatizado de mensagens e painel administrativo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">3. Cadastro e Conta do Usuário</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para utilizar a Plataforma, é necessário criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente em caso de uso não autorizado.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            A MagicZap reserva-se o direito de recusar, suspender ou encerrar contas que apresentem informações falsas ou incompletas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">4. Planos e Preços</h2>
          <p className="text-muted-foreground leading-relaxed">A MagicZap oferece os seguintes planos de assinatura:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Plano Starter</strong> — ideal para profissionais autônomos e pequenos negócios, com funcionalidades essenciais de automação.</li>
            <li><strong>Plano Profissional</strong> — voltado para negócios em crescimento, com recursos avançados e maior capacidade de agendamentos simultâneos.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Os preços, funcionalidades e limites de cada plano estão descritos na página de preços da Plataforma e podem ser atualizados periodicamente, mediante aviso prévio.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">5. Pagamento e Renovação</h2>
          <p className="text-muted-foreground leading-relaxed">
            As assinaturas são cobradas mensalmente de forma recorrente. Ao assinar um plano, você autoriza a cobrança automática no método de pagamento cadastrado. A renovação ocorre automaticamente ao final de cada período, salvo cancelamento prévio pelo usuário.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Em caso de falha no pagamento, a MagicZap poderá suspender o acesso à Plataforma até a regularização.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">6. Cancelamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            Você pode cancelar sua assinatura a qualquer momento através do painel da Plataforma. O cancelamento será efetivado ao final do período de cobrança vigente, mantendo-se o acesso até essa data. Não há reembolso proporcional para períodos parciais.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">7. Uso Permitido e Proibido</h2>
          <p className="text-muted-foreground leading-relaxed">Ao utilizar a MagicZap, você concorda em <strong>não</strong>:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Enviar mensagens não solicitadas em massa (spam);</li>
            <li>Utilizar a Plataforma para golpes, fraudes ou esquemas enganosos;</li>
            <li>Realizar qualquer atividade ilegal ou que viole direitos de terceiros;</li>
            <li>Violar as políticas, termos ou diretrizes do WhatsApp e Meta;</li>
            <li>Interferir no funcionamento da Plataforma ou tentar acessar dados de outros usuários;</li>
            <li>Revender, sublicenciar ou redistribuir o acesso à Plataforma sem autorização.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            A violação dessas regras pode resultar em suspensão ou encerramento imediato da conta, sem direito a reembolso.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">8. Responsabilidade do Usuário</h2>
          <p className="text-muted-foreground leading-relaxed">
            O usuário é integralmente responsável pelo conteúdo das mensagens enviadas através da Plataforma, incluindo textos, imagens, áudios e quaisquer outros materiais. A MagicZap atua exclusivamente como ferramenta de automação e não exerce controle editorial sobre o conteúdo transmitido pelos usuários.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">9. Limitação de Responsabilidade</h2>
          <p className="text-muted-foreground leading-relaxed">
            A Plataforma é fornecida <strong>"como está" (as is)</strong> e <strong>"conforme disponibilidade" (as available)</strong>. A MagicZap não garante:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Disponibilidade ininterrupta (uptime de 100%) da Plataforma;</li>
            <li>Que o serviço estará livre de erros, falhas ou vulnerabilidades;</li>
            <li>Resultados específicos de negócio derivados do uso da Plataforma.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            A MagicZap <strong>não se responsabiliza</strong> por banimentos, bloqueios, restrições ou limitações impostos pelo WhatsApp, Meta ou quaisquer APIs e serviços de terceiros integrados à Plataforma. O uso da Plataforma em conformidade com as políticas do WhatsApp é de responsabilidade exclusiva do usuário.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">10. Suspensão e Encerramento</h2>
          <p className="text-muted-foreground leading-relaxed">
            A MagicZap pode, a seu exclusivo critério, suspender ou encerrar contas que violem estes Termos, que apresentem comportamento abusivo ou que coloquem em risco a integridade da Plataforma e de outros usuários. Notificações serão enviadas quando possível, mas a MagicZap não é obrigada a fornecer aviso prévio em casos de violações graves.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">11. Propriedade Intelectual</h2>
          <p className="text-muted-foreground leading-relaxed">
            Todo o conteúdo, código-fonte, design, logotipos, marcas, funcionalidades e tecnologia da MagicZap são de propriedade exclusiva da empresa e protegidos pelas leis de propriedade intelectual. É proibida a reprodução, distribuição ou uso não autorizado de qualquer elemento da Plataforma.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">12. Alterações nos Termos</h2>
          <p className="text-muted-foreground leading-relaxed">
            A MagicZap reserva-se o direito de modificar estes Termos a qualquer momento. As alterações serão comunicadas por e-mail ou notificação na Plataforma. O uso continuado após a publicação das alterações constitui aceitação dos novos Termos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">13. Legislação e Foro</h2>
          <p className="text-muted-foreground leading-relaxed">
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da empresa para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">14. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Em caso de dúvidas sobre estes Termos de Uso, entre em contato conosco pelo e-mail: <strong>contato@magiczap.com.br</strong>.
          </p>
        </section>
      </article>
    </main>
  </div>
);
};

export default TermsOfService;
