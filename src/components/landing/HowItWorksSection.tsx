import { Smartphone, BrainCircuit, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const steps = [
  { icon: Smartphone, title: "Conecte seu WhatsApp", desc: "Vincule seu número em poucos cliques. Sem instalar nada." },
  { icon: BrainCircuit, title: "Treine a IA com seu negócio", desc: "Informe seus serviços, preços e horários. A IA aprende tudo." },
  { icon: CalendarCheck, title: "Ela atende e agenda sozinha", desc: "Clientes são atendidos 24h e agendam direto pelo WhatsApp." },
];

const HowItWorksSection = () => (
  <section id="como-funciona" className="py-24 px-4">
    <div className="max-w-5xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Comece em 3 passos simples</h2>
        <p className="text-muted-foreground text-lg">Nenhum conhecimento técnico necessário</p>
      </motion.div>
      <div className="grid sm:grid-cols-3 gap-8">
        {steps.map((step, i) => (
          <motion.div key={step.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.15 }} className="text-center">
            <div className="relative mx-auto mb-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <step.icon className="w-10 h-10 text-primary" />
              </div>
              <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center shadow-md">
                {i + 1}
              </span>
            </div>
            <h3 className="font-display font-bold text-lg mb-2">{step.title}</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
