import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const FAQ_ITEMS = [
  { q: "Preciso de conhecimento técnico?", a: "Não! A configuração é guiada em poucos passos e leva menos de 10 minutos. Você cadastra seus serviços, horários e pronto — a IA já começa a atender." },
  { q: "Como funciona o atendimento pelo WhatsApp?", a: "Seu cliente manda mensagem no WhatsApp da barbearia e a IA responde na hora: informa preços, mostra horários disponíveis, agenda o corte e envia lembrete automático antes do horário." },
  { q: "O atendimento é realmente automático?", a: "100%. A IA responde perguntas, informa preços dos serviços, agenda horários e envia lembretes — tudo sem você precisar tocar no celular." },
  { q: "Posso personalizar as respostas da IA?", a: "Sim! Você escolhe o nome da assistente, o tom de voz (formal, descontraído, etc.) e cadastra seus serviços com preços e duração. As respostas se adaptam à sua barbearia." },
  { q: "E se o cliente faltar?", a: "O sistema detecta automaticamente no-shows e pode enviar mensagens de recuperação para remarcar o horário, reduzindo drasticamente as faltas." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multa e sem burocracia. Cancele direto pelo painel em poucos cliques." },
  { q: "Funciona fora do horário comercial?", a: "Sim! A IA atende 24 horas, inclusive de madrugada e nos finais de semana. Seu cliente agenda quando quiser, sem esperar você responder." },
];

const FaqSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Perguntas Frequentes</h2>
          <p className="text-muted-foreground text-lg">Tudo que você precisa saber antes de começar</p>
        </motion.div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <Card className="rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-0">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left group"
                  >
                    <span className="font-semibold text-sm pr-4 group-hover:text-primary transition-colors duration-200">
                      {faq.q}
                    </span>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
