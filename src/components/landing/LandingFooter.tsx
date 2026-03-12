import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const LandingFooter = () => (
  <footer className="border-t border-dark-section-foreground/10 py-10 px-4 bg-dark-section">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dark-section-foreground/60"
    >
      <div className="flex items-center gap-2">
        <img src={logo} alt="MagicZap" className="h-12 w-auto" />
      </div>
      <p className="text-dark-section-foreground/50">© {new Date().getFullYear()} MagicZap. Todos os direitos reservados.</p>
      <div className="flex items-center gap-4">
        <Link to="/terms-of-service" className="hover:text-foreground transition-colors duration-200">
          Termos de Uso
        </Link>
        <Link to="/privacy-policy" className="hover:text-foreground transition-colors duration-200">
          Privacidade
        </Link>
        <Link to="/auth" className="hover:text-foreground transition-colors duration-200">
          Área do Cliente
        </Link>
      </div>
    </motion.div>
  </footer>
);

export default LandingFooter;
