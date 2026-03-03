import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Lock, Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const PricingSection = () => (
  <section id="precos" className="py-24 px-4 bg-secondary/30">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="text-center mb-6"
      >
        <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">
          Planos que cabem no seu bolso
        </h2>
        <p className="text-muted-foreground text-lg">Escolha o ideal para o tamanho do seu negócio</p>
      </motion.div>

      {/* Trial highlight */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1, type: "spring" }}
        className="mb-12"
      >
        <div className="mx-auto max-w-xl rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 px-6 py-4 text-center shadow-sm">
          <p className="text-base sm:text-lg font-semibold text-foreground">
            🎁 Comece grátis no plano Free. Sem cartão, sem compromisso.
          </p>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-6 items-stretch">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="h-full border border-border/60 shadow-sm hover:shadow-md transition-all bg-muted/30">
            <CardContent className="p-6 flex flex-col h-full">
              <Badge variant="secondary" className="w-fit mb-3 text-[11px]">🔥 Comece Grátis</Badge>
              <h3 className="font-display font-bold text-xl mb-1">Free</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-semibold mb-2">Ideal para testar a automação na sua barbearia</p>
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
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/70">
                    <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/auth?signup=true">
                <Button className="w-full" variant="outline">Começar Gratuitamente</Button>
              </a>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profissional */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileHover={{ y: -8, transition: { duration: 0.2 } }}
        >
          <Card className="h-full border-2 border-primary shadow-xl scale-[1.03] relative overflow-hidden">
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            <CardContent className="p-6 flex flex-col h-full relative">
              <Badge className="w-fit mb-3 bg-primary text-primary-foreground">
                <Sparkles className="w-3 h-3 mr-1" /> Mais Popular
              </Badge>
              <h3 className="font-display font-bold text-xl mb-1">Profissional</h3>
              <div className="mb-1">
                <span className="text-4xl font-bold">R$ 167</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-xs text-primary font-medium mb-4">Trial gratuito por cotas</p>
              <p className="text-sm text-muted-foreground mb-5">Para negócios que querem atendimento inteligente e mais volume.</p>
              <p className="text-xs font-semibold text-foreground mb-2">Inclui tudo do Starter +</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {["Até 5 atendentes simultâneos", "Até 1.500 mensagens por mês", "Até 200 agendamentos por mês", "Respostas com IA personalizada", "Fluxos automatizados customizados", "Relatórios de atendimento", "Organização de contatos", "Suporte prioritário"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/auth?signup=true">
                <Button className="w-full shadow-lg shadow-primary/20">Começar grátis</Button>
              </a>
            </CardContent>
          </Card>
        </motion.div>

        {/* Empresarial */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          whileHover={{ y: -6, transition: { duration: 0.2 } }}
        >
          <Card className="h-full border-2 border-transparent shadow-md hover:shadow-xl transition-all">
            <CardContent className="p-6 flex flex-col h-full">
              <Badge variant="secondary" className="w-fit mb-3">🚀 Em breve</Badge>
              <h3 className="font-display font-bold text-xl mb-1">Empresa</h3>
              <div className="mb-1">
                <Lock className="inline w-5 h-5 text-muted-foreground mr-1" />
                <span className="text-2xl font-bold text-muted-foreground">Em breve</span>
              </div>
              <p className="text-xs text-primary font-medium mb-4">Teste gratuito disponível no lançamento</p>
              <p className="text-sm text-muted-foreground mb-5">Solução completa para empresas que precisam de múltiplos atendentes e integrações avançadas.</p>
              <ul className="space-y-2.5 mb-6 flex-1 opacity-60">
                {["Múltiplos números WhatsApp", "Mensagens ilimitadas", "Tudo do Profissional", "Integração com sistemas", "Gerente de conta dedicado"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/auth">
                <Button className="w-full" variant="outline">Entrar na lista de espera</Button>
              </a>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center max-w-2xl mx-auto leading-relaxed">
        * <strong>Atendente</strong> refere-se à quantidade de agendamentos simultâneos permitidos no mesmo horário na sua agenda. 
        No plano Free, apenas 1 agendamento por horário. No Profissional, até 5 agendamentos ao mesmo tempo — ideal para negócios com mais de um profissional atendendo. A IA responde a todos os clientes simultaneamente, sem limite.
      </p>
    </div>
  </section>
);

export default PricingSection;
