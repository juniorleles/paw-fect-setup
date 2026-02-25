import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClose = () => {
    window.close();
    setTimeout(() => {
      navigate("/onboarding", { state: { step: 6 } });
    }, 100);
  };

  return (
  <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
        <h1 className="text-lg font-display font-bold text-foreground">Política de Privacidade</h1>
        <Button variant="outline" size="sm" className="ml-auto" onClick={handleClose}>
          Fechar
        </Button>
      </div>
    </header>

    <main className="max-w-4xl mx-auto px-4 py-12">
      <article className="prose prose-sm sm:prose max-w-none text-foreground space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">Política de Privacidade</h1>
          <p className="text-muted-foreground text-sm">Última atualização: 25 de fevereiro de 2026</p>
        </div>

        <section className="space-y-3">
          <p className="text-muted-foreground leading-relaxed">
            A MagicZap ("nós", "nosso" ou "Plataforma") valoriza a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">1. Dados Coletados</h2>
          
          <h3 className="text-lg font-display font-medium text-foreground">1.1 Dados de Cadastro</h3>
          <p className="text-muted-foreground leading-relaxed">
            Ao criar sua conta, coletamos informações como nome, endereço de e-mail, telefone, nome do estabelecimento, endereço comercial e demais dados fornecidos durante o processo de onboarding.
          </p>
          
          <h3 className="text-lg font-display font-medium text-foreground">1.2 Dados Técnicos</h3>
          <p className="text-muted-foreground leading-relaxed">
            Coletamos automaticamente dados técnicos como endereço IP, tipo de navegador, sistema operacional, páginas acessadas, horário de acesso e dados de uso da Plataforma para fins de análise e segurança.
          </p>
          
          <h3 className="text-lg font-display font-medium text-foreground">1.3 Dados de Mensagens e Integrações</h3>
          <p className="text-muted-foreground leading-relaxed">
            Para o funcionamento da automação, processamos as mensagens trocadas via WhatsApp através da Plataforma, incluindo conteúdo textual, dados de agendamento e informações dos contatos dos clientes do usuário.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">2. Finalidade do Uso dos Dados</h2>
          <p className="text-muted-foreground leading-relaxed">Utilizamos os dados coletados para:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Funcionamento da automação:</strong> processar e enviar mensagens, gerenciar agendamentos e operar a IA da Plataforma;</li>
            <li><strong>Melhoria da Plataforma:</strong> analisar o uso para aprimorar funcionalidades, corrigir erros e desenvolver novos recursos;</li>
            <li><strong>Comunicação:</strong> enviar notificações sobre a conta, atualizações do serviço e informações relevantes;</li>
            <li><strong>Segurança:</strong> prevenir fraudes, abusos e acessos não autorizados;</li>
            <li><strong>Obrigações legais:</strong> cumprir exigências legais e regulatórias aplicáveis.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">3. Base Legal (LGPD)</h2>
          <p className="text-muted-foreground leading-relaxed">O tratamento dos dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Execução de contrato:</strong> para fornecer os serviços contratados pelo usuário (Art. 7º, V);</li>
            <li><strong>Consentimento:</strong> quando aplicável, mediante aceite explícito do usuário (Art. 7º, I);</li>
            <li><strong>Legítimo interesse:</strong> para melhoria da Plataforma e comunicações relevantes (Art. 7º, IX);</li>
            <li><strong>Cumprimento de obrigação legal:</strong> para atender exigências legais e regulatórias (Art. 7º, II).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">4. Armazenamento e Segurança</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS/SSL) e em repouso. Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não autorizado, perda, destruição ou alteração, incluindo:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Criptografia de dados sensíveis;</li>
            <li>Controle de acesso baseado em funções (RBAC);</li>
            <li>Monitoramento contínuo de segurança;</li>
            <li>Backups regulares e redundância de dados.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">5. Compartilhamento com Terceiros</h2>
          <p className="text-muted-foreground leading-relaxed">
            Podemos compartilhar dados pessoais com terceiros estritamente necessários para a operação da Plataforma:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Provedores de infraestrutura cloud:</strong> para hospedagem e armazenamento de dados;</li>
            <li><strong>APIs de mensagens:</strong> para integração com o WhatsApp e envio de mensagens;</li>
            <li><strong>Processadores de pagamento:</strong> para gestão de cobranças e assinaturas;</li>
            <li><strong>Ferramentas de IA:</strong> para processamento de linguagem natural e automação inteligente.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Não vendemos, alugamos ou negociamos dados pessoais com terceiros para fins de marketing. Todos os parceiros são obrigados contratualmente a manter a confidencialidade e segurança dos dados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">6. Direitos do Usuário</h2>
          <p className="text-muted-foreground leading-relaxed">
            Conforme a LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li><strong>Acesso:</strong> solicitar informações sobre quais dados pessoais possuímos sobre você;</li>
            <li><strong>Correção:</strong> solicitar a atualização ou correção de dados incompletos ou inexatos;</li>
            <li><strong>Exclusão:</strong> solicitar a eliminação dos seus dados pessoais, ressalvadas as obrigações legais de retenção;</li>
            <li><strong>Portabilidade:</strong> solicitar a transferência dos seus dados a outro fornecedor de serviço;</li>
            <li><strong>Revogação do consentimento:</strong> retirar o consentimento a qualquer momento, quando aplicável;</li>
            <li><strong>Oposição:</strong> opor-se ao tratamento de dados em determinadas circunstâncias.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Para exercer qualquer desses direitos, entre em contato pelo e-mail indicado na seção de Contato.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">7. Tempo de Retenção</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os dados pessoais são retidos pelo tempo necessário para cumprir as finalidades para as quais foram coletados, incluindo obrigações legais, contratuais, de prestação de contas ou requisição de autoridades competentes. Após o encerramento da conta, os dados serão mantidos por até 6 (seis) meses para fins de backup e auditoria, sendo posteriormente eliminados de forma segura.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">8. Cookies e Tecnologias de Rastreamento</h2>
          <p className="text-muted-foreground leading-relaxed">
            A Plataforma utiliza cookies e tecnologias semelhantes para melhorar a experiência do usuário, realizar análises de uso e manter a segurança da sessão. Você pode gerenciar as preferências de cookies através das configurações do seu navegador.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">9. Atualizações desta Política</h2>
          <p className="text-muted-foreground leading-relaxed">
            Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças nas práticas da Plataforma ou na legislação aplicável. As alterações serão comunicadas por e-mail ou notificação na Plataforma, e a data de "última atualização" será revisada.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">10. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para dúvidas, solicitações ou exercício de direitos relacionados à privacidade e proteção de dados, entre em contato:
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>E-mail:</strong> privacidade@magiczap.com.br
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Comprometemo-nos a responder todas as solicitações no prazo de até 15 (quinze) dias úteis, conforme previsto na LGPD.
          </p>
        </section>
      </article>
    </main>
  </div>
);
};

export default PrivacyPolicy;
