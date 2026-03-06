import { motion } from "framer-motion";
import { Clock, MessageSquare, CalendarCheck, BellOff } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const metrics = [
  {
    icon: Clock,
    value: "24h",
    label: "Disponível",
    description: "Sua IA atende e agenda a qualquer hora, mesmo de madrugada",
  },
  {
    icon: MessageSquare,
    value: "100%",
    label: "Automático",
    description: "Zero intervenção manual — do atendimento à confirmação",
  },
  {
    icon: CalendarCheck,
    value: "0",
    label: "Ligações perdidas",
    description: "Nunca mais perca um cliente por não atender o telefone",
  },
  {
    icon: BellOff,
    value: "–80%",
    label: "Menos faltas",
    description: "Lembretes automáticos reduzem drasticamente os no-shows",
  },
];

const MetricsSection = () => (
  <section className="py-20 px-4 bg-muted/30">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
          Números que <span className="text-primary">fazem a diferença</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          O que muda quando a IA cuida do seu atendimento
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="bg-card rounded-2xl border border-border/60 p-6 text-center shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <m.icon className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">{m.value}</p>
            <p className="font-semibold text-sm mb-2">{m.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default MetricsSection;
