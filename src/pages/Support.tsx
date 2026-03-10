import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, MessageCircle, Send, Clock, Headphones, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SupportChatbot from "@/components/support/SupportChatbot";

const SUPPORT_EMAIL = "contato@magiczap.io";
const SUPPORT_WHATSAPP = "5511980912272";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const Support = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        phone: email.trim(),
        message: `[SUPORTE] ${message.trim()}`,
      });
      if (error) throw error;
      toast({ title: "Mensagem enviada!", description: "Responderemos em breve." });
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Olá! Preciso de ajuda com a MagicZap.")}`;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-1">
            <Headphones className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Suporte</h1>
          </div>
          <p className="text-muted-foreground">
            Converse com a Mia (IA) para respostas instantâneas ou escolha outro canal.
          </p>
        </motion.div>

        {/* Main layout: Chatbot + sidebar */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Chatbot - takes more space */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Assistente IA</h2>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Resposta instantânea</span>
            </div>
            <SupportChatbot />
          </motion.div>

          {/* Sidebar: channels + form */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* WhatsApp card */}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="group block">
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer bg-[hsl(142,70%,45%)]/10 hover:bg-[hsl(142,70%,45%)]/15">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-xl bg-[hsl(142,70%,45%)] p-2.5 text-white shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm mb-0.5 group-hover:text-[hsl(142,70%,35%)] transition-colors">
                      WhatsApp
                    </h3>
                    <p className="text-xs text-muted-foreground mb-1">
                      Atendimento humano direto
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Seg–Sex, 9h às 18h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </a>

            {/* Email card */}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Suporte - MagicZap")}`} className="group block">
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer bg-primary/5 hover:bg-primary/10">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="rounded-xl bg-primary p-2.5 text-primary-foreground shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm mb-0.5 group-hover:text-primary transition-colors">
                      E-mail
                    </h3>
                    <p className="text-xs text-muted-foreground mb-1">
                      Envie um e-mail detalhado
                    </p>
                    <p className="text-[10px] text-muted-foreground">{SUPPORT_EMAIL}</p>
                  </div>
                </CardContent>
              </Card>
            </a>

            {/* Contact form */}
            <Card className="border-none shadow-xl">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-display">Envie uma mensagem</CardTitle>
                <CardDescription className="text-xs">Retornaremos em até 24h</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input
                    placeholder="Seu nome *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                    className="h-9 text-sm"
                  />
                  <Input
                    placeholder="Seu e-mail *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                    className="h-9 text-sm"
                  />
                  <Textarea
                    placeholder="Descreva como podemos ajudar *"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={1000}
                    rows={3}
                    className="text-sm"
                  />
                  <Button type="submit" className="w-full h-10 text-sm font-bold" disabled={sending}>
                    <Send className="w-3.5 h-3.5 mr-2" />
                    {sending ? "Enviando..." : "Enviar"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Support;
