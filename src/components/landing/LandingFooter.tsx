import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const LandingFooter = () => (
  <footer className="border-t border-border py-10 px-4 bg-secondary/20">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground"
    >
      <div className="flex items-center gap-2">
        <img src={logo} alt="MagicZap" className="h-6 w-auto" />
      </div>
      <p>© {new Date().getFullYear()} MagicZap. Todos os direitos reservados.</p>
      <div className="flex items-center gap-4">
        <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
          Termos de Uso
        </Link>
        <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
          Privacidade
        </Link>
        <Link to="/auth" className="hover:text-foreground transition-colors">
          Área do Cliente
        </Link>
      </div>
    </motion.div>
  </footer>
);

export default LandingFooter;
