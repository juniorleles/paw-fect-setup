import { Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

const LandingFooter = () => (
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
);

export default LandingFooter;
