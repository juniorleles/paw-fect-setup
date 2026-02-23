import { Card, CardContent } from "@/components/ui/card";
import { XCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const pains = [
  "Demora para responder mensagens",
  "Atendimento só em horário comercial",
  "Clientes esquecem o agendamento",
  "Equipe sobrecarregada",
];

const solutions = [
  "Respostas automáticas 24h",
  "Agendamentos pelo WhatsApp",
  "Lembretes inteligentes",
  "Mais tempo para focar no negócio",
];

const PainSolutionSection = () => (
  <section id="beneficios" className="py-24 px-4 bg-secondary/30">
    <div className="max-w-5xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Você perde clientes sem perceber</h2>
        <p className="text-muted-foreground text-lg">Compare como é o atendimento sem e com automação</p>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="h-full border-2 border-destructive/20 shadow-md">
            <CardContent className="p-8">
              <h3 className="font-display font-bold text-xl mb-6 text-destructive">Sem automação</h3>
              <ul className="space-y-4">
                {pains.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-muted-foreground">
                    <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="h-full border-2 border-primary/30 shadow-md">
            <CardContent className="p-8">
              <h3 className="font-display font-bold text-xl mb-6 text-primary">Com a Secretária Digital</h3>
              <ul className="space-y-4">
                {solutions.map((s) => (
                  <li key={s} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  </section>
);

export default PainSolutionSection;
