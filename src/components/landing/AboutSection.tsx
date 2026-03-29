import { motion } from "framer-motion";
import { Building2, Shield, Zap } from "lucide-react";

const AboutSection = () => (
  <section className="py-16 px-4 bg-background border-b border-border/40">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto text-center"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Sobre a MagicZap</h2>
      </div>
      <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
        A MagicZap é uma plataforma de automação de WhatsApp para diversos segmentos.
        Nossa solução ajuda negócios a automatizar atendimentos, agendamentos e
        recuperação de clientes de forma simples e eficiente.
      </p>
      <div className="flex flex-wrap justify-center gap-6 mt-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4 text-primary" />
          <span>Empresa verificada</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="w-4 h-4 text-primary" />
          <span>Tecnologia própria</span>
        </div>
      </div>
    </motion.div>
  </section>
);

export default AboutSection;
