import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Send } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface Props {
  title: string;
  subtitle: string;
  businessLabel: string;
  businessPlaceholder: string;
  ctaText: string;
}

const NicheLeadForm = ({ title, subtitle, businessLabel, businessPlaceholder, ctaText }: Props) => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", business: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.business) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Recebemos seus dados!", description: "Em breve entraremos em contato." });
  };

  if (submitted) {
    return (
      <section id="contato" className="py-24 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Obrigado, {form.name}!</h3>
          <p className="text-muted-foreground">Recebemos seus dados. Em breve nossa equipe entrará em contato para configurar sua Secretária Digital.</p>
        </motion.div>
      </section>
    );
  }

  return (
    <section id="contato" className="py-24 px-4 bg-secondary/50">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-lg">{subtitle}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="rounded-2xl border border-primary/20 shadow-lg">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Seu nome</label>
                  <Input placeholder="João Silva" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
                  <Input placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{businessLabel}</label>
                  <Input placeholder={businessPlaceholder} value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base shadow-md shadow-primary/15">
                  <Send className="w-4 h-4 mr-2" /> {ctaText}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Sem spam. Seus dados estão seguros.</p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default NicheLeadForm;
