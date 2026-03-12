import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import WhatsAppMockup from "@/components/landing/WhatsAppMockup";

const benefits = [
  "Teste grátis",
  "Sem cartão",
  "Configuração em minutos",
];

const LandingHero = () => (
  <section className="relative pt-20 pb-0 px-4 bg-background">
    {/* Decorative background */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
    </div>

    <div className="relative max-w-3xl mx-auto text-center">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Badge variant="outline" className="mb-6 text-sm px-4 py-1.5 border-primary/30 text-primary bg-primary/5 font-medium rounded-full">
          💈 Automação de WhatsApp para barbearias
        </Badge>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] mb-6 tracking-tight"
      >
        Automatize o WhatsApp da sua barbearia com{" "}
        <span className="text-primary">IA</span>
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
      >
        A IA responde clientes, agenda horários e recupera clientes que sumiram — automaticamente no seu WhatsApp.
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex justify-center"
      >
        <a href="/auth?signup=true&plan=free">
          <Button size="lg" className="h-14 px-10 text-base font-bold rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-200">
            Testar grátis agora <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </a>
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-5"
      >
        {benefits.map((b) => (
          <span key={b} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-primary" /> {b}
          </span>
        ))}
      </motion.div>

      {/* Niche callout */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.65 }}
        className="text-sm font-semibold text-primary mt-6"
      >
        💈 Criado especialmente para barbearias
      </motion.p>
    </div>

    {/* Demo simulator */}
    <div className="relative max-w-lg mx-auto mt-12 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mb-3"
      >
        <p className="text-base font-bold text-foreground">👉 Teste a IA agora</p>
        <p className="text-sm text-muted-foreground">Simule um cliente falando com sua barbearia.</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}
      >
        <WhatsAppMockup embedded />
      </motion.div>
    </div>
  </section>
);

export default LandingHero;
