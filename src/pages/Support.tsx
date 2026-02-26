import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, MessageCircle, Send, ArrowLeft, Clock, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const SUPPORT_EMAIL = "suporte@secretariadigital.com.br";
const SUPPORT_WHATSAPP = "5511999999999";

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

  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Olá! Preciso de ajuda com a Secretária Digital.")}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-secondary/20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-foreground">Suporte</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">
            Como podemos te ajudar?
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Escolha o canal que preferir. Estamos prontos para atender você.
          </p>
        </motion.div>

        {/* Quick channels */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid sm:grid-cols-2 gap-4 mb-12"
        >
          {/* WhatsApp card */}
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="group">
            <Card className="h-full border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer bg-[hsl(142,70%,45%)]/10 hover:bg-[hsl(142,70%,45%)]/15">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="rounded-xl bg-[hsl(142,70%,45%)] p-3 text-white shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-[hsl(142,70%,35%)] transition-colors">
                    WhatsApp
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Atendimento rápido e direto pelo WhatsApp
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Seg–Sex, 9h às 18h</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </a>

          {/* Email card */}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Suporte - Secretária Digital")}`} className="group">
            <Card className="h-full border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer bg-primary/5 hover:bg-primary/10">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="rounded-xl bg-primary p-3 text-primary-foreground shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    E-mail
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Envie um e-mail detalhado para nosso time
                  </p>
                  <p className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</p>
                </div>
              </CardContent>
            </Card>
          </a>
        </motion.div>

        {/* Contact form */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-xl mx-auto"
        >
          <Card className="border-none shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-display">Envie uma mensagem</CardTitle>
              <CardDescription>Preencha o formulário e retornaremos em até 24h</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Seu nome *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
                <Input
                  placeholder="Seu e-mail *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                />
                <Textarea
                  placeholder="Descreva como podemos ajudar *"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={1000}
                  rows={4}
                />
                <Button type="submit" className="w-full h-12 text-base font-bold" disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Enviando..." : "Enviar mensagem"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Support;
