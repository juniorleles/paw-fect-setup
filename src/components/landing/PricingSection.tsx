import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Lock, Star } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const PricingSection = () => (
  <section id="precos" className="py-24 px-4 bg-secondary/50">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="text-center mb-6"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
          Planos que cabem no seu bolso
        </h2>
        <p className="text-muted-foreground text-lg">Escolha o ideal para o tamanho do seu negócio</p>
      </motion.div>

      {/* Trial highlight */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-12"
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-primary/15 bg-primary/[0.03] px-6 py-4 text-center">
          <p className="text-base sm:text-lg font-semibold text-foreground">
            🎁 Comece grátis no plano Free. Sem cartão, sem compromisso.
          </p>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-5 items-stretch">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6 flex flex-col h-full">
              <Badge variant="secondary" className="w-fit mb-3 text-[11px] rounded-lg">🔥 Comece Grátis</Badge>
              <h3 className="font-bold text-xl mb-1">Free</h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">R$ 0</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-semibold mb-2">Ideal para testar a automação</p>
              <p className="text-sm text-muted-foreground mb-5">Perfeito para conhecer o sistema e automatizar seus primeiros agendamentos.</p>
              <ul className="space-y-2.5 mb-4 flex-1">
                {["1 número de WhatsApp", "1 atendente", "Até 30 agendamentos por mês", "Até 150 mensagens por mês", "1 lembrete automático (24h antes)"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2 mb-5">
                {["Sem lembrete duplo", "Sem campanhas automáticas", "Sem recuperação de clientes inativos", "Sem relatórios financeiros"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/60">
                    <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/auth?signup=true&plan=free">
                <Button className="w-full rounded-xl" variant="outline">Começar Gratuitamente</Button>
              </a>
            </CardContent>
          </Card>
        </motion.div>

        {/* Essencial */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ y: -6, transition: { duration: 0.2 } }}
        >
          <Card className="h-full rounded-2xl border-2 border-primary shadow-lg shadow-primary/10 scale-[1.03] relative overflow-hidden">
            <CardContent className="p-6 flex flex-col h-full relative">
              <Badge className="w-fit mb-3 bg-primary text-primary-foreground rounded-lg">
                <Star className="w-3 h-3 mr-1 fill-current" /> Mais Escolhido
              </Badge>
              <h3 className="font-bold text-xl mb-1">Essencial</h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">R$ 97</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-semibold mb-2">Automação completa para reduzir faltas e aumentar faturamento.</p>
              <p className="text-sm text-muted-foreground mb-5">Ideal para quem quer profissionalizar o atendimento e recuperar clientes.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "1 número de WhatsApp",
                  "Agendamentos ilimitados",
                  "Até 800 mensagens por mês",
                  "Lembrete duplo automático (24h + 3h antes)",
                  "Botão Confirmar / Reagendar",
                  "Lista de clientes inativos",
                  "Recuperação automática de faltas",
                  "Relatório de faltas evitadas",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/auth?signup=true&plan=starter">
                <Button className="w-full rounded-xl shadow-md shadow-primary/15 font-bold text-wrap py-3 h-auto leading-snug">
                  Quero Automatizar Minha Barbearia
                </Button>
              </a>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pro */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full rounded-2xl border border-primary/30 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary/40" />
            <CardContent className="p-6 flex flex-col h-full">
              <Badge className="w-fit mb-3 bg-primary/8 text-primary border-primary/20 rounded-lg" variant="outline">🚀 Para Quem Quer Crescer</Badge>
              <h3 className="font-bold text-xl mb-1">Pro</h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">R$ 157</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-semibold mb-2">Automação inteligente para aumentar faturamento todo mês.</p>
              <p className="text-sm text-muted-foreground mb-5">Transforme o WhatsApp em uma máquina automática de agendamentos.</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "1 número de WhatsApp",
                  "Agendamentos ilimitados",
                  "Até 1.500 mensagens por mês",
                  "Lembrete duplo automático (24h + 3h antes)",
                  "Botão Confirmar / Reagendar",
                  "Lista automática de clientes inativos",
                  "Campanha automática de retorno de clientes",
                  "Mensagem de upsell pós-atendimento",
                  "Recuperação automática de faltas",
                  "Relatório de faturamento estimado",
                  "Prioridade no suporte",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
                {[
                  { label: "Agendamento por voz no WhatsApp", tag: "Novo" },
                  { label: "Conexão oficial via Meta Cloud API", tag: "Novo" },
                ].map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="flex items-center gap-1.5">
                      {f.label}
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 leading-4 rounded-md bg-primary/10 text-primary border-primary/20 font-bold">{f.tag}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
              <a href="/auth?signup=true&plan=professional">
                <Button className="w-full rounded-xl font-bold text-wrap py-3 h-auto leading-snug hover:bg-primary/90">
                  Quero Crescer no Automático
                </Button>
              </a>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center max-w-2xl mx-auto leading-relaxed">
        * <strong>Atendente</strong> refere-se à quantidade de agendamentos simultâneos permitidos no mesmo horário na sua agenda. 
        No plano Free, apenas 1 agendamento por horário. No Essencial, até 5 agendamentos ao mesmo tempo — ideal para negócios com mais de um profissional atendendo. A IA responde a todos os clientes simultaneamente, sem limite.
      </p>
    </div>
  </section>
);

export default PricingSection;
