import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const PLANS = [
  {
    name: "Starter", price: "97", period: "/mês", popular: false,
    features: ["1 número WhatsApp", "Até 100 agendamentos/mês", "Lembretes automáticos", "Suporte por email"],
  },
  {
    name: "Profissional", price: "197", period: "/mês", popular: true,
    features: ["1 número WhatsApp", "Agendamentos ilimitados", "Lembretes + confirmações", "Respostas personalizadas", "Relatórios de atendimento", "Suporte prioritário"],
  },
  {
    name: "Empresa", price: "397", period: "/mês", popular: false,
    features: ["Múltiplos números", "Agendamentos ilimitados", "Tudo do Profissional", "Integração com sistemas", "Gerente de conta dedicado"],
  },
];

const PricingSection = () => (
  <section id="precos" className="py-24 px-4 bg-secondary/30">
    <div className="max-w-5xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Planos que cabem no seu bolso</h2>
        <p className="text-muted-foreground text-lg">Escolha o ideal para o tamanho do seu negócio</p>
      </motion.div>
      <div className="grid sm:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => (
          <motion.div key={plan.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.1 }}>
            <Card className={`h-full border-2 transition-shadow ${plan.popular ? "border-primary shadow-xl scale-[1.03]" : "border-transparent shadow-md"}`}>
              <CardContent className="p-6 flex flex-col h-full">
                {plan.popular && (
                  <Badge className="w-fit mb-3 bg-primary text-primary-foreground">Mais popular</Badge>
                )}
                <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                <div className="mb-5">
                  <span className="text-4xl font-bold">R$ {plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#contact">
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    Começar agora
                  </Button>
                </a>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
