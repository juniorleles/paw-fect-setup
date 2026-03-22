import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Globe, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoLight from "@/assets/logo-light.png";

const About = () => (
  <div className="min-h-screen bg-dark-section text-dark-section-foreground">
    <nav className="border-b border-dark-section-foreground/10 px-4 h-16 flex items-center max-w-4xl mx-auto">
      <Link to="/">
        <Button variant="ghost" size="sm" className="text-dark-section-foreground/70 hover:text-white hover:bg-white/10 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </Link>
    </nav>

    <main className="max-w-2xl mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-8">
        <img src={logoLight} alt="MagicZap" className="h-14 w-auto" />
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Sobre a MagicZap</h1>
          </div>
          <p className="text-dark-section-foreground/70 leading-relaxed">
            A MagicZap é uma plataforma de automação de WhatsApp focada em barbearias.
            Nossa solução ajuda empresas a automatizar atendimentos, agendamentos e
            recuperação de clientes de forma simples e eficiente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">O que fazemos</h2>
          <ul className="space-y-2 text-dark-section-foreground/70">
            <li>• Atendimento automático via WhatsApp com inteligência artificial</li>
            <li>• Agendamento de horários sem intervenção humana</li>
            <li>• Recuperação automática de clientes inativos</li>
            <li>• Lembretes inteligentes para reduzir faltas</li>
          </ul>
        </section>

        <section className="border-t border-dark-section-foreground/10 pt-8">
          <h2 className="text-lg font-semibold mb-4">Contato</h2>
          <div className="space-y-3 text-dark-section-foreground/70">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <a href="mailto:contato@magiczap.io" className="hover:text-white transition-colors">
                contato@magiczap.io
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <a href="https://www.magiczap.io" className="hover:text-white transition-colors">
                www.magiczap.io
              </a>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-16 pt-8 border-t border-dark-section-foreground/10 text-sm text-dark-section-foreground/40">
        © {new Date().getFullYear()} MagicZap. Todos os direitos reservados.
      </footer>
    </main>
  </div>
);

export default About;
