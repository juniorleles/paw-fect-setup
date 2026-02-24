import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MessageSquare, CalendarDays, Zap } from "lucide-react";
import { motion } from "framer-motion";
import heroIllustration from "@/assets/hero-illustration.png";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const LandingHero = () => (
  <section className="relative overflow-hidden pt-16 pb-24 px-4">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
    <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }} className="text-center lg:text-left">
        <Badge variant="secondary" className="mb-4 text-sm px-4 py-1.5">
          <Zap className="w-3.5 h-3.5 mr-1.5" /> Automação inteligente no WhatsApp
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
          Seu WhatsApp <span className="text-primary">vendendo e agendando</span> clientes 24h por dia
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 mb-8">
          IA que responde clientes automaticamente, agenda horários e reduz faltas — ideal para negócios que atendem pelo WhatsApp.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
          <a href="/auth">
            <Button size="lg" className="h-14 px-8 text-base font-bold shadow-lg">
              Testar grátis no meu WhatsApp <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
          <a href="#como-funciona">
            <Button variant="outline" size="lg" className="h-14 px-8 text-base">
              Como Funciona
            </Button>
          </a>
        </div>
        <p className="text-sm text-muted-foreground mt-4">Sem cartão • Configuração em minutos</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative hidden lg:flex justify-center"
      >
        <motion.img
          src={heroIllustration}
          alt="Secretária Digital atendendo clientes pelo WhatsApp automaticamente"
          className="w-[420px] rounded-3xl shadow-2xl"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -top-4 -right-4 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg backdrop-blur-sm"
          animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <CalendarDays className="w-8 h-8 text-primary" />
        </motion.div>
        <motion.div
          className="absolute -bottom-2 -left-4 w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center shadow-lg backdrop-blur-sm"
          animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <MessageSquare className="w-7 h-7 text-accent" />
        </motion.div>
      </motion.div>
    </div>
  </section>
);

export default LandingHero;
