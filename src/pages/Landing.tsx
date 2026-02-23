import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Zap, MessageSquare, CalendarDays, Clock, Shield,
  ChevronDown, ChevronUp, Star, ArrowRight, Check, Phone,
  Scissors, Stethoscope, Dumbbell, UtensilsCrossed, PawPrint,
  Sparkles, Building2, Send, Menu, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { NICHE_LABELS } from "@/types/onboarding";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: MessageSquare, title: "Atendimento 24/7", desc: "Sua secretária responde clientes via WhatsApp a qualquer hora, sem pausas." },
  { icon: CalendarDays, title: "Agendamento Automático", desc: "Clientes agendam direto pelo WhatsApp. Sem ligações, sem espera." },
  { icon: Clock, title: "Lembretes Inteligentes", desc: "Redução de faltas com lembretes automáticos antes de cada compromisso." },
  { icon: Zap, title: "IA Personalizada", desc: "Tom de voz e respostas ajustadas ao seu tipo de negócio." },
  { icon: Shield, title: "Dados Seguros", desc: "Seus dados protegidos com criptografia e políticas de segurança." },
  { icon: Sparkles, title: "Setup em Minutos", desc: "Configure tudo em 5 passos simples. Sem conhecimento técnico." },
];

const NICHE_ICONS: Record<string, React.ElementType> = {
  petshop: PawPrint, clinica: Stethoscope, salao: Scissors,
  barbearia: Scissors, estetica: Sparkles, escritorio: Building2,
  academia: Dumbbell, restaurante: UtensilsCrossed, veterinaria: Stethoscope,
  outros: Briefcase,
};

const TESTIMONIALS = [
  { name: "Carla M.", niche: "Salão de Beleza", text: "Reduzi 80% das ligações e minha agenda nunca esteve tão organizada!", stars: 5 },
  { name: "Dr. Ricardo S.", niche: "Clínica", text: "Meus pacientes adoram a praticidade de agendar pelo WhatsApp.", stars: 5 },
  { name: "Pedro L.", niche: "Barbearia", text: "Parece que tenho uma recepcionista de verdade. Clientes ficam impressionados.", stars: 5 },
  { name: "Ana P.", niche: "Estética", text: "As faltas caíram drasticamente com os lembretes automáticos.", stars: 5 },
];

const PLANS = [
  {
    name: "Starter", price: "97", period: "/mês", popular: false,
    features: ["1 número WhatsApp", "Até 100 agendamentos/mês", "Lembretes automáticos", "Suporte por email"],
  },
  {
    name: "Profissional", price: "197", period: "/mês", popular: true,
    features: ["1 número WhatsApp", "Agendamentos ilimitados", "Lembretes + confirmações", "IA personalizada", "Relatórios", "Suporte prioritário"],
  },
  {
    name: "Empresa", price: "397", period: "/mês", popular: false,
    features: ["Múltiplos números", "Agendamentos ilimitados", "Tudo do Profissional", "API de integração", "Gerente de conta dedicado"],
  },
];

const FAQ_ITEMS = [
  { q: "Preciso de conhecimento técnico para configurar?", a: "Não! O processo de configuração é guiado em 5 etapas simples e leva menos de 10 minutos." },
  { q: "Funciona para qualquer tipo de negócio?", a: "Sim! Atendemos pet shops, clínicas, salões, barbearias, academias, restaurantes, veterinárias e muito mais." },
  { q: "O atendimento é realmente automático?", a: "Sim. A IA responde perguntas, agenda serviços e envia lembretes sem intervenção humana." },
  { q: "Posso personalizar as respostas da IA?", a: "Claro! Você escolhe o tom de voz (formal, amigável ou divertido) e o nome da sua secretária." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem multa e sem burocracia. Cancele diretamente pelo painel." },
];

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const Landing = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSending(true);
    setTimeout(() => {
      toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
      setName(""); setPhone(""); setMessage("");
      setSending(false);
    }, 1000);
  };

  const nicheKeys = Object.keys(NICHE_LABELS) as (keyof typeof NICHE_LABELS)[];

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary" />
            <span className="text-xl font-display font-bold">Secretária <span className="text-primary">Digital</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#niches" className="hover:text-foreground transition-colors">Nichos</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Depoimentos</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth"><Button variant="outline" size="sm">Entrar</Button></Link>
            <a href="#contact"><Button size="sm">Começar Agora</Button></a>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            {["features", "niches", "testimonials", "pricing", "faq"].map((s) => (
              <a key={s} href={`#${s}`} onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-muted-foreground hover:text-foreground capitalize">{s === "features" ? "Funcionalidades" : s === "niches" ? "Nichos" : s === "testimonials" ? "Depoimentos" : s === "pricing" ? "Preços" : "FAQ"}</a>
            ))}
            <div className="flex gap-2 pt-2">
              <Link to="/auth" className="flex-1"><Button variant="outline" size="sm" className="w-full">Entrar</Button></Link>
              <a href="#contact" className="flex-1" onClick={() => setMobileMenu(false)}><Button size="sm" className="w-full">Começar</Button></a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }} className="relative max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 text-sm px-4 py-1.5">
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Inteligência Artificial no WhatsApp
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
            Sua <span className="text-primary">Secretária Digital</span> que nunca tira folga
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Automatize agendamentos, atenda clientes 24/7 pelo WhatsApp e reduza faltas com lembretes inteligentes. Para qualquer tipo de negócio.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#contact">
              <Button size="lg" className="h-14 px-8 text-base font-bold shadow-lg">
                Quero Experimentar <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
            <a href="#features">
              <Button variant="outline" size="lg" className="h-14 px-8 text-base">
                Como Funciona
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Tudo que você precisa</h2>
            <p className="text-muted-foreground text-lg">Funcionalidades pensadas para facilitar seu dia a dia</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <Card className="h-full border-none shadow-md hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Niches */}
      <section id="niches" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Para todo tipo de negócio</h2>
            <p className="text-muted-foreground text-lg">Adapta-se automaticamente ao seu segmento</p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {nicheKeys.map((key, i) => {
              const Icon = NICHE_ICONS[key] || Briefcase;
              return (
                <motion.div key={key} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}>
                  <Card className="text-center border-none shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-default">
                    <CardContent className="p-5">
                      <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-3">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                      <p className="font-semibold text-sm">{NICHE_LABELS[key]}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Quem usa, recomenda</h2>
            <p className="text-muted-foreground text-lg">Histórias reais de clientes satisfeitos</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <Card className="h-full border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 italic">"{t.text}"</p>
                    <div>
                      <p className="font-bold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.niche}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Planos simples, sem surpresas</h2>
            <p className="text-muted-foreground text-lg">Escolha o ideal para o seu negócio</p>
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

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-secondary/30">
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

      {/* Contact Form */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Comece agora</h2>
              <p className="text-muted-foreground text-lg">Deixe seus dados e entraremos em contato</p>
            </div>
            <Card className="border-none shadow-xl">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input placeholder="Seu nome *" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
                  </div>
                  <div>
                    <Input placeholder="WhatsApp com DDD *" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={20} type="tel" />
                  </div>
                  <div>
                    <Textarea placeholder="Mensagem (opcional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} />
                  </div>
                  <Button type="submit" className="w-full h-12 font-bold" disabled={sending}>
                    <Send className="w-4 h-4 mr-2" /> {sending ? "Enviando..." : "Enviar Mensagem"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-foreground">Secretária Digital</span>
          </div>
          <p>© {new Date().getFullYear()} Secretária Digital. Todos os direitos reservados.</p>
          <Link to="/auth" className="hover:text-foreground transition-colors">Área do Cliente</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
