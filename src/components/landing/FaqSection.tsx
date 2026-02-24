import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const FAQ_ITEMS = [
  { q: "Preciso de conhecimento técnico?", a: "Não! O processo de configuração é guiado em 5 etapas simples e leva menos de 10 minutos." },
  { q: "Funciona para qualquer tipo de negócio?", a: "Sim! Atendemos salões, barbearias, clínicas, pet shops, consultórios, estéticas, veterinárias e muito mais." },
  { q: "O atendimento é realmente automático?", a: "Sim. A IA responde perguntas, informa preços, agenda serviços e envia lembretes sem precisar de ninguém." },
  { q: "Posso personalizar as respostas?", a: "Claro! Você escolhe o tom de voz e o nome da sua secretária. As respostas se adaptam ao seu negócio." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multa e sem burocracia. Cancele diretamente pelo painel." },
  { q: "Meus clientes vão perceber que é uma IA?", a: "As respostas são naturais e personalizadas. A maioria dos clientes elogia a rapidez do atendimento!" },
];

const FaqSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Perguntas Frequentes</h2>
        </motion.div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                    <span className="font-semibold text-sm pr-4">{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-sm text-muted-foreground -mt-1">{faq.a}</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
