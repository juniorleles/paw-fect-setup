import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MessageSquare, CalendarDays, Zap, Users, Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import WhatsAppMockup from "@/components/landing/WhatsAppMockup";

const AnimatedCounter = ({ target, suffix = "", duration = 2000 }: { target: number; suffix?: string; duration?: number }) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return <span ref={ref}>{value.toLocaleString("pt-BR")}{suffix}</span>;
};

const heroStats = [
  { icon: Users, value: 5000, suffix: "+", label: "Atendimentos/mês" },
  { icon: Clock, value: 24, suffix: "h", label: "Disponibilidade" },
  { icon: TrendingUp, value: 80, suffix: "%", label: "Menos faltas" },
];

const LandingHero = () => (
  <section className="relative overflow-hidden pt-24 pb-16 px-4 bg-background">
    {/* Subtle grid pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:64px_64px]" />
    
    {/* Gradient orb */}
    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

    <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
      {/* Left content */}
      <div className="text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-6 text-sm px-4 py-1.5 border-primary/30 text-primary bg-primary/5 font-medium rounded-full">
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Automação inteligente no WhatsApp
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] mb-6 tracking-tight"
        >
          Seu WhatsApp{" "}
          <span className="text-primary">
            vendendo e agendando
          </span>{" "}
          clientes 24h por dia
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed"
        >
          IA que responde clientes automaticamente, agenda horários e reduz faltas — ideal para negócios que atendem pelo WhatsApp.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
        >
          <a href="/auth?signup=true&plan=free">
            <Button size="lg" className="h-13 px-8 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200">
              Testar grátis no meu WhatsApp <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
          <a href="#como-funciona">
            <Button variant="outline" size="lg" className="h-13 px-8 text-base rounded-xl border-border hover:bg-secondary transition-colors duration-200">
              Como Funciona
            </Button>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-sm text-muted-foreground mt-4"
        >
          Sem cartão • Configuração em minutos
        </motion.p>

      </div>

      {/* Right illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}
        className="relative hidden lg:flex justify-center"
      >
        <div className="relative">
          {/* Glow */}
          <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-3xl scale-110" />

          <motion.img
            src={heroIllustration}
            alt="Secretária Digital atendendo clientes pelo WhatsApp automaticamente"
            className="relative w-[420px] rounded-3xl shadow-2xl shadow-foreground/5"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating badges */}
          <motion.div
            className="absolute -top-4 -right-4 bg-card rounded-2xl p-3 shadow-lg border border-border/60"
            animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Agendamento</p>
                <p className="text-[10px] text-muted-foreground">Automático ✓</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute -bottom-4 -left-4 bg-card rounded-2xl p-3 shadow-lg border border-border/60"
            animate={{ y: [0, 8, 0], rotate: [0, -2, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Resposta</p>
                <p className="text-[10px] text-muted-foreground">Em 2 segundos</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default LandingHero;
