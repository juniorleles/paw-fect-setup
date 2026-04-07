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

const PETSHOP_FAQ = [
  { q: "Funciona para banho e tosa, veterinária e pet shop?", a: "Sim! A solução é ideal para qualquer negócio pet: banho e tosa, clínica veterinária, pet shop com serviços, hotelaria pet e mais." },
  { q: "A IA consegue responder sobre preços e horários?", a: "Sim! Você cadastra seus serviços com preços e duração, e a IA informa automaticamente ao cliente, sem você precisar responder manualmente." },
  { q: "Como funciona o lembrete de banho?", a: "A IA envia lembretes automáticos 24h e 3h antes do horário agendado. O cliente confirma ou reagenda direto pelo WhatsApp com um clique." },
  { q: "Preciso de conhecimento técnico?", a: "Não! A configuração é simples e guiada. Em menos de 10 minutos seu pet shop já está com a IA respondendo clientes automaticamente." },
  { q: "Posso agendar consultas veterinárias e vacinas?", a: "Claro! Você configura qualquer tipo de serviço: banho, tosa, consulta veterinária, vacinação, hospedagem. A IA agenda tudo automaticamente." },
  { q: "E se o cliente não aparecer?", a: "O sistema detecta faltas automaticamente e pode enviar mensagens de recuperação para remarcar o horário, reduzindo perdas no faturamento." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multa e sem burocracia. Cancele direto pelo painel em poucos cliques." },
];

const LandingPetshop = () => (
  <div className="min-h-screen bg-background font-sans overflow-x-hidden">
    <NicheNavbar />
    <NicheHeroSection
      badge="🐾 Secretária Digital para Pet Shops"
      headline={
        <>
          Secretária <span className="text-primary">IA</span> para Pet Shop: Nunca perca um{" "}
          <span className="text-primary">agendamento</span>
        </>
      }
      subheadline="Lembrete automático de banho e tosa, agendamento de consultas e vacinas, respostas rápidas para dúvidas frequentes — tudo pelo WhatsApp."
      ctaText="Quero mais vendas"
      nicheCallout="✨ Para pet shops, clínicas veterinárias, banho e tosa"
    />
    {/* Simulador WhatsApp */}
    <div className="relative max-w-lg mx-auto py-12 px-4 text-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="mb-3">
        <p className="text-base font-bold text-foreground">👉 Teste a IA agora</p>
        <p className="text-sm text-muted-foreground">Simule um cliente agendando um serviço para seu pet.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}>
        <WhatsAppMockup embedded />
      </motion.div>
    </div>

    <NichePainSolutionSection
      title={<>Seu pet shop perde clientes <span className="text-destructive">sem perceber</span></>}
      subtitle="Veja como a automação transforma o atendimento do seu pet shop"
      pains={[
        "Clientes esquecem o horário do banho",
        "WhatsApp lotado de perguntas sobre preço e horário",
        "Perda de vendas por falta de resposta rápida",
        "Dificuldade em fidelizar clientes",
        "Funcionários perdendo tempo respondendo WhatsApp",
      ]}
      solutions={[
        "Lembrete automático de banho e tosa (24h + 3h antes)",
        "Respostas instantâneas sobre preços e horários",
        "Agendamento automático 24/7 pelo WhatsApp",
        "Campanhas de retorno para clientes inativos",
        "Mais tempo para cuidar dos pets",
      ]}
    />
    <HowItWorksSection />


    <PricingSection />
    <NicheFaqSection items={PETSHOP_FAQ} />
    <CtaSection />
    <LandingFooter />
  </div>
);

export default LandingPetshop;
