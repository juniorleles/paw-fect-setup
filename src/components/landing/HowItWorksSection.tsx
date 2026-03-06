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
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Comece em 3 passos simples</h2>
        <p className="text-muted-foreground text-lg">Nenhum conhecimento técnico necessário</p>
      </motion.div>

      <div className="relative">
        {/* Connecting line */}
        <motion.div
          className="hidden sm:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-border"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{ transformOrigin: "left" }}
        />

        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2, type: "spring", stiffness: 100 }}
              className="text-center"
            >
              <div className="relative mx-auto mb-6">
                <div className="w-24 h-24 rounded-2xl bg-primary/8 border border-primary/10 flex items-center justify-center mx-auto">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>
                <motion.span
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shadow-md shadow-primary/20"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.2, type: "spring", stiffness: 300 }}
                >
                  {i + 1}
                </motion.span>
              </div>
              <h3 className="font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
