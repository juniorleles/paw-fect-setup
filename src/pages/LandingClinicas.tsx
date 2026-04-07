import NicheNavbar from "@/components/landing-niches/NicheNavbar";
import NicheHeroSection from "@/components/landing-niches/NicheHeroSection";
import NichePainSolutionSection from "@/components/landing-niches/NichePainSolutionSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import NicheFaqSection from "@/components/landing-niches/NicheFaqSection";

import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";
import WhatsAppMockup from "@/components/landing/WhatsAppMockup";
import { motion } from "framer-motion";

const CLINICAS_FAQ = [
  { q: "Funciona para qualquer tipo de clínica?", a: "Sim! Funciona para consultórios médicos, clínicas odontológicas, psicólogos, fisioterapeutas, nutricionistas e qualquer profissional de saúde que atenda com agendamento." },
  { q: "A IA consegue fazer triagem de urgência?", a: "Sim! Você pode configurar perguntas iniciais para identificar urgências e direcionar o paciente de forma prioritária ou orientá-lo a buscar pronto-atendimento." },
  { q: "Os dados dos pacientes ficam seguros?", a: "Absolutamente. Utilizamos criptografia e seguimos as melhores práticas de segurança. As conversas são confidenciais e armazenadas com segurança." },
  { q: "Preciso de conhecimento técnico?", a: "Não! A configuração é guiada e leva menos de 10 minutos. Você cadastra seus serviços, horários e pronto — a IA já começa a atender seus pacientes." },
  { q: "Como funciona o lembrete de consulta?", a: "A IA envia automaticamente lembretes 24h e 3h antes da consulta via WhatsApp, com botão para confirmar ou reagendar. Isso reduz drasticamente as faltas." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multa e sem burocracia. Cancele direto pelo painel em poucos cliques." },
  { q: "Funciona fora do horário comercial?", a: "Sim! A IA atende 24 horas. Pacientes podem agendar consultas de madrugada, nos finais de semana — quando for mais conveniente para eles." },
];

const LandingClinicas = () => (
  <div className="min-h-screen bg-background font-sans overflow-x-hidden">
    <NicheNavbar />
    <NicheHeroSection
      badge="🏥 Secretária Digital para Clínicas e Consultórios"
      headline={
        <>
          Atenda seus pacientes <span className="text-primary">24h</span> com a Secretária{" "}
          <span className="text-primary">IA</span> para WhatsApp
        </>
      }
      subheadline="A IA responde pacientes, agenda consultas, envia lembretes e faz triagem — automaticamente no WhatsApp da sua clínica."
      ctaText="Quero automatizar minha clínica"
      nicheCallout="✨ Para clínicas médicas, consultórios, dentistas, psicólogos e mais"
    />
    {/* Simulador WhatsApp */}
    <div className="relative max-w-lg mx-auto py-12 px-4 text-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="mb-3">
        <p className="text-base font-bold text-foreground">👉 Teste a IA agora</p>
        <p className="text-sm text-muted-foreground">Simule um paciente agendando uma consulta.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}>
        <WhatsAppMockup embedded />
      </motion.div>
    </div>

    <NichePainSolutionSection
      title={<>Sua clínica perde pacientes <span className="text-destructive">sem perceber</span></>}
      subtitle="Veja como a automação transforma o atendimento da sua clínica"
      pains={[
        "Pacientes ligam e não conseguem agendar",
        "WhatsApp sem resposta fora do horário",
        "Pacientes esquecem a consulta e não comparecem",
        "Recepcionista sobrecarregada com mensagens",
        "Falta de triagem causa atendimentos desnecessários",
      ]}
      solutions={[
        "Agendamento automático 24/7 pelo WhatsApp",
        "Lembrete inteligente de consulta (24h + 3h antes)",
        "Confirmação e reagendamento com 1 clique",
        "Triagem automatizada de urgência",
        "Mais tempo para focar no atendimento presencial",
      ]}
    />
    <HowItWorksSection />


    <PricingSection />
    <NicheFaqSection items={CLINICAS_FAQ} />
    <CtaSection />
    <LandingFooter />
  </div>
);

export default LandingClinicas;
