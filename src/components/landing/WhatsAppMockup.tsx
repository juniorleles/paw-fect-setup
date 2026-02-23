import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const messages = [
  { from: "client", text: "Oi! Quanto custa um corte masculino?", time: "10:32" },
  { from: "bot", text: "Olá! 😊 O corte masculino custa R$ 45 e leva cerca de 30 min. Deseja agendar um horário?", time: "10:32" },
  { from: "client", text: "Quero! Tem vaga amanhã à tarde?", time: "10:33" },
  { from: "bot", text: "Tenho às 14h e às 16h. Qual prefere?", time: "10:33" },
  { from: "client", text: "14h!", time: "10:33" },
  { from: "bot", text: "Pronto! ✅ Agendado para amanhã às 14h. Enviarei um lembrete 1h antes. Até lá!", time: "10:34" },
];

const WhatsAppMockup = () => (
  <section className="py-20 px-4">
    <div className="max-w-2xl mx-auto">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Veja como funciona na prática</h2>
        <p className="text-muted-foreground text-lg">Uma conversa real no WhatsApp com a Secretária Digital</p>
      </motion.div>
      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-[hsl(var(--muted))] rounded-2xl overflow-hidden shadow-xl max-w-md mx-auto"
      >
        {/* Header */}
        <div className="bg-primary px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold text-sm">SD</div>
          <div>
            <p className="text-primary-foreground font-bold text-sm">Secretária Digital</p>
            <p className="text-primary-foreground/70 text-xs">online</p>
          </div>
        </div>
        {/* Messages */}
        <div className="p-4 space-y-3">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * i + 0.3, duration: 0.3 }}
              className={`flex ${msg.from === "client" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                msg.from === "client"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card text-card-foreground rounded-bl-sm shadow-sm"
              }`}>
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${msg.from === "client" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{msg.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default WhatsAppMockup;
