import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MessageSquare, CalendarDays, Zap, Users, Clock, TrendingUp } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import heroIllustration from "@/assets/hero-illustration.png";

const AnimatedCounter = ({ target, suffix = "", duration = 2 }: { target: number; suffix?: string; duration?: number }) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const motionVal = { val: 0 };
          const controls = animate(motionVal, { val: target }, {
            duration,
            ease: "easeOut",
            onUpdate: (latest) => setValue(Math.round(latest.val)),
          });
          return () => controls.stop();
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

const floatingShapes = [
  { size: 80, x: "10%", y: "20%", delay: 0, duration: 6 },
  { size: 60, x: "85%", y: "15%", delay: 1, duration: 7 },
  { size: 40, x: "75%", y: "70%", delay: 2, duration: 5 },
  { size: 50, x: "5%", y: "75%", delay: 0.5, duration: 8 },
  { size: 30, x: "50%", y: "10%", delay: 1.5, duration: 6.5 },
];

const LandingHero = () => (
  <section className="relative overflow-hidden pt-20 pb-28 px-4">
    {/* Animated background shapes */}
    {floatingShapes.map((shape, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full bg-primary/5 blur-xl pointer-events-none"
        style={{ width: shape.size, height: shape.size, left: shape.x, top: shape.y }}
        animate={{
          y: [0, -20, 0, 15, 0],
          x: [0, 10, 0, -10, 0],
          scale: [1, 1.2, 1, 0.9, 1],
        }}
        transition={{ duration: shape.duration, repeat: Infinity, ease: "easeInOut", delay: shape.delay }}
      />
    ))}

    <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />

    <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
      {/* Left content */}
      <div className="text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="mb-5 text-sm px-4 py-1.5 shadow-sm">
            <Zap className="w-3.5 h-3.5 mr-1.5 text-accent" /> Automação inteligente no WhatsApp
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.1] mb-6"
        >
          Seu WhatsApp{" "}
          <span className="relative">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              vendendo e agendando
            </span>
            <motion.span
              className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, delay: 0.8 }}
            />
          </span>{" "}
          clientes 24h por dia
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 mb-8"
        >
          IA que responde clientes automaticamente, agenda horários e reduz faltas — ideal para negócios que atendem pelo WhatsApp.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
        >
          <a href="/auth">
            <Button size="lg" className="h-14 px-8 text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              Testar grátis no meu WhatsApp <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
          <a href="#como-funciona">
            <Button variant="outline" size="lg" className="h-14 px-8 text-base hover:bg-secondary transition-colors">
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

        {/* Animated stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10 grid grid-cols-3 gap-4"
        >
          {heroStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center lg:text-left"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
            >
              <div className="flex items-center gap-1.5 justify-center lg:justify-start mb-1">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Right illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}
        className="relative hidden lg:flex justify-center"
      >
        <div className="relative">
          {/* Glow effect behind image */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl scale-110" />

          <motion.img
            src={heroIllustration}
            alt="Secretária Digital atendendo clientes pelo WhatsApp automaticamente"
            className="relative w-[420px] rounded-3xl shadow-2xl"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating badges */}
          <motion.div
            className="absolute -top-6 -right-6 bg-card rounded-2xl p-3 shadow-xl border border-border"
            animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Agendamento</p>
                <p className="text-[10px] text-muted-foreground">Automático ✓</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute -bottom-4 -left-6 bg-card rounded-2xl p-3 shadow-xl border border-border"
            animate={{ y: [0, 8, 0], rotate: [0, -3, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-accent" />
              <div>
                <p className="text-xs font-bold text-foreground">Resposta</p>
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
