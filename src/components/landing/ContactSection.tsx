import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const ContactSection = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        phone: phone.trim(),
        message: message.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
      setName(""); setPhone(""); setMessage("");
    } catch {
      toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-24 px-4 bg-secondary/30">
      <div className="max-w-xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Pronto para automatizar seu WhatsApp?</h2>
            <p className="text-muted-foreground text-lg">Deixe seus dados e ganhe um teste gratuito</p>
          </div>
          <Card className="border-none shadow-xl">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Seu nome *" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
                <Input placeholder="WhatsApp com DDD *" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={20} type="tel" />
                <Textarea placeholder="Conte sobre seu negócio (opcional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} />
                <Button type="submit" className="w-full h-14 text-base font-bold shadow-lg" disabled={sending}>
                  <Send className="w-5 h-5 mr-2" /> {sending ? "Enviando..." : "Quero minha secretária digital"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Sem compromisso • Responderemos em até 24h</p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
