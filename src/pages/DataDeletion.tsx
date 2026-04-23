import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, ArrowLeft } from "lucide-react";

const DataDeletion = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <h1 className="text-lg font-display font-bold text-foreground">
            Exclusão de Dados
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <article className="prose prose-sm sm:prose max-w-none text-foreground space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Solicitação de Exclusão de Dados
            </h1>
            <p className="text-muted-foreground text-sm">
              Última atualização: 23 de abril de 2026
            </p>
          </div>

          <section className="space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              A MagicZap, operada por <strong className="text-foreground">SYNC SOLUCOES</strong>,
              respeita seus direitos sobre os dados pessoais que você nos forneceu.
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018,
              artigo 18) e com as políticas da plataforma Meta (Facebook/WhatsApp),
              você pode solicitar a exclusão completa dos seus dados a qualquer momento.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">
              1. Quem pode solicitar
            </h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>
                <strong className="text-foreground">Titulares de conta MagicZap:</strong>{" "}
                proprietários de negócios que se cadastraram em magiczap.io.
              </li>
              <li>
                <strong className="text-foreground">Clientes finais (consumidores):</strong>{" "}
                pessoas que conversaram via WhatsApp com um negócio que utiliza
                a MagicZap e desejam que suas mensagens e dados de contato sejam removidos.
              </li>
              <li>
                <strong className="text-foreground">Usuários autenticados via Facebook:</strong>{" "}
                quem se conectou ao app MagicZap (ID 1335266151850577) através do
                fluxo Embedded Signup do WhatsApp Business.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">
              2. Como solicitar
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Para solicitar a exclusão dos seus dados, envie um e-mail ou mensagem
              de WhatsApp para um dos canais oficiais abaixo, contendo as seguintes informações:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>Nome completo</li>
              <li>E-mail cadastrado na MagicZap (se aplicável)</li>
              <li>Número de telefone associado à conta ou ao WhatsApp</li>
              <li>
                Assunto:{" "}
                <code className="bg-muted px-2 py-0.5 rounded text-foreground">
                  Solicitação de Exclusão de Dados — LGPD
                </code>
              </li>
              <li>
                Descrição: confirmação de que deseja a exclusão completa de
                todos os dados pessoais armazenados pela MagicZap.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">
              3. Canais oficiais
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href="mailto:contato@magiczap.io?subject=Solicita%C3%A7%C3%A3o%20de%20Exclus%C3%A3o%20de%20Dados%20%E2%80%94%20LGPD&body=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20a%20exclus%C3%A3o%20completa%20dos%20meus%20dados.%0A%0ANome%3A%20%0AE-mail%20cadastrado%3A%20%0ATelefone%3A%20"
                className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary transition-colors no-underline"
              >
                <div className="p-2 rounded-md bg-primary/10">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-display font-semibold text-foreground">
                    E-mail
                  </div>
                  <div className="text-sm text-muted-foreground">
                    contato@magiczap.io
                  </div>
                </div>
              </a>
              <a
                href="https://wa.me/5511980912272?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20a%20exclus%C3%A3o%20dos%20meus%20dados%20pessoais%20%E2%80%94%20LGPD."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary transition-colors no-underline"
              >
                <div className="p-2 rounded-md bg-primary/10">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-display font-semibold text-foreground">
                    WhatsApp
                  </div>
                  <div className="text-sm text-muted-foreground">
                    +55 11 98091-2272
                  </div>
                </div>
              </a>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">
              4. Prazo de resposta
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Conforme estabelecido pelo artigo 19 da LGPD, sua solicitação será
              processada em até <strong className="text-foreground">15 (quinze) dias</strong>{" "}
              a partir do recebimento. Você receberá uma confirmação por e-mail
              quando a exclusão for concluída.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">
              5. O que será excluído
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A solicitação de exclusão removerá permanentemente os seguintes
              dados de nossos sistemas:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>Dados cadastrais (nome, e-mail, telefone, endereço comercial)</li>
              <li>Configurações do estabelecimento e atendentes</li>
              <li>Histórico de conversas e mensagens via WhatsApp</li>
              <li>Histórico de agendamentos e clientes cadastrados</li>
              <li>Tokens de acesso da integração com Meta WhatsApp Cloud API</li>
              <li>Mídias enviadas (áudios, imagens) armazenadas em nosso storage</li>
              <li>Métricas de uso e logs de atividade</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">
              6. Dados que podem ser retidos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Em cumprimento a obrigações legais (artigo 16 da LGPD), poderemos
              reter por períodos determinados:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>
                Registros financeiros e de pagamento por <strong className="text-foreground">5 anos</strong>{" "}
                (legislação fiscal brasileira).
              </li>
              <li>
                Logs de auditoria anonimizados por até <strong className="text-foreground">12 meses</strong>{" "}
                para fins de segurança e prevenção a fraudes.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">
              7. Desconexão da integração com Facebook/WhatsApp
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você se conectou ao MagicZap através do Embedded Signup do
              Facebook/WhatsApp e deseja apenas revogar a autorização de acesso
              do nosso app à sua WhatsApp Business Account (sem excluir sua conta MagicZap):
            </p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-2 leading-relaxed">
              <li>
                Acesse{" "}
                <a
                  href="https://www.facebook.com/settings/?tab=business_tools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Configurações do Facebook → Ferramentas de Negócios
                </a>
                .
              </li>
              <li>Localize "magiczap_solutions" na lista de apps conectados.</li>
              <li>Clique em "Remover" para revogar o acesso.</li>
            </ol>
            <p className="text-muted-foreground leading-relaxed">
              Após a revogação, nosso app deixará automaticamente de receber
              mensagens da sua WABA. Para excluir também os dados já armazenados,
              utilize o canal de solicitação de exclusão acima.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground border-b border-border pb-2">
              8. Encarregado de Proteção de Dados (DPO)
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Para qualquer dúvida sobre o tratamento dos seus dados pessoais
              ou para exercer outros direitos previstos no artigo 18 da LGPD
              (acesso, correção, portabilidade, etc.), entre em contato com
              nosso Encarregado de Proteção de Dados pelo e-mail{" "}
              <a
                href="mailto:contato@magiczap.io"
                className="text-primary hover:underline"
              >
                contato@magiczap.io
              </a>
              .
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-border">
            <p className="text-muted-foreground text-sm leading-relaxed">
              <strong className="text-foreground">Controlador dos dados:</strong>{" "}
              SYNC SOLUCOES — operadora da plataforma MagicZap (
              <a
                href="https://www.magiczap.io"
                className="text-primary hover:underline"
              >
                magiczap.io
              </a>
              ).
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default DataDeletion;
