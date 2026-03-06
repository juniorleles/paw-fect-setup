import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const NAV_LINKS = [
  { href: "#beneficios", label: "Benefícios" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#nichos", label: "Nichos" },
  { href: "#depoimentos", label: "Depoimentos" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
];

const LandingNavbar = () => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-primary" />
          <span className="text-xl font-display font-bold">
            Secretária <span className="text-primary">Digital</span>
          </span>
        </button>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
            Entrar
          </Button>
          <a href="/auth?signup=true&plan=free">
            <Button size="sm">Cadastrar</Button>
          </a>
        </div>
        <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {mobileMenu && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-muted-foreground hover:text-foreground">
              {link.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMobileMenu(false); navigate("/auth"); }}>
              Entrar
            </Button>
            <a href="/auth?signup=true&plan=free" className="flex-1" onClick={() => setMobileMenu(false)}>
              <Button size="sm" className="w-full">Cadastrar</Button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
