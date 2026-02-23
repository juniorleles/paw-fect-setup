import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

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

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-primary" />
          <span className="text-xl font-display font-bold">
            Secretária <span className="text-primary">Digital</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth">
            <Button variant="outline" size="sm">Entrar</Button>
          </Link>
          <a href="#contact">
            <Button size="sm">Testar Grátis</Button>
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
            <Link to="/auth" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">Entrar</Button>
            </Link>
            <a href="#contact" className="flex-1" onClick={() => setMobileMenu(false)}>
              <Button size="sm" className="w-full">Testar Grátis</Button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
