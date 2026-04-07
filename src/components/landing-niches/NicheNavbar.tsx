import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import logoLight from "@/assets/logo-light.png";

const NAV_LINKS = [
  { href: "#beneficios", label: "Benefícios" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
];

const NICHE_LINKS = [
  { href: "/clinicas", label: "Para Clínicas" },
  { href: "/petshop", label: "Para Pet Shops" },
];

const NicheNavbar = () => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-dark-section backdrop-blur-xl border-b border-dark-section-foreground/10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img src={logoLight} alt="MagicZap" className="h-20 w-auto" />
        </button>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-dark-section-foreground/70">
          {NICHE_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => navigate(link.href)}
              className={`transition-colors duration-200 ${location.pathname === link.href ? "text-white font-bold" : "hover:text-white"}`}
            >
              {link.label}
            </button>
          ))}
          <span className="w-px h-4 bg-dark-section-foreground/20" />
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-white transition-colors duration-200">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-dark-section-foreground/70 hover:text-white hover:bg-white/10 font-medium"
            onClick={() => navigate("/auth")}
          >
            Entrar
          </Button>
          <a href="/auth?signup=true&plan=free">
            <Button size="sm" className="rounded-lg font-semibold shadow-sm hover:shadow-md transition-shadow">
              Testar grátis
            </Button>
          </a>
        </div>

        <button className="md:hidden text-dark-section-foreground" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenu && (
        <div className="md:hidden border-t border-dark-section-foreground/10 bg-dark-section px-4 py-4 space-y-3">
          {NICHE_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => { setMobileMenu(false); navigate(link.href); }}
              className={`block text-sm font-medium transition-colors ${location.pathname === link.href ? "text-white font-bold" : "text-dark-section-foreground/70 hover:text-white"}`}
            >
              {link.label}
            </button>
          ))}
          <div className="border-t border-dark-section-foreground/10 pt-3">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-dark-section-foreground/70 hover:text-white transition-colors py-1">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1 rounded-lg border-dark-section-foreground/20 text-dark-section-foreground hover:bg-white/10" onClick={() => { setMobileMenu(false); navigate("/auth"); }}>
              Entrar
            </Button>
            <a href="/auth?signup=true&plan=free" className="flex-1" onClick={() => setMobileMenu(false)}>
              <Button size="sm" className="w-full rounded-lg font-semibold">Testar grátis</Button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NicheNavbar;
