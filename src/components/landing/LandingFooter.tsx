import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Globe } from "lucide-react";
import logoLight from "@/assets/logo-light.png";

const LandingFooter = () => (
  <footer className="border-t border-dark-section-foreground/10 py-10 px-4 bg-dark-section">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-dark-section-foreground/60"
    >
      <div className="flex flex-col items-center sm:items-start gap-2">
        <img src={logoLight} alt="MagicZap" className="h-16 w-auto" />
        <div className="text-xs text-dark-section-foreground/40 leading-relaxed space-y-1">
          <p>MagicZap é uma marca da SYNC SOLUCOES EM TECNOLOGIA LTDA.</p>
          <p>CNPJ: 11.565.823/0001-80</p>
          <p className="flex items-center gap-1">
            <Mail className="w-3 h-3" /> Email:{" "}
            <a href="mailto:contato@magiczap.io" className="hover:text-white transition-colors">contato@magiczap.io</a>
          </p>
          <p className="flex items-center gap-1">
            <Globe className="w-3 h-3" /> Site:{" "}
            <a href="https://www.magiczap.io" className="hover:text-white transition-colors">www.magiczap.io</a>
          </p>
        </div>
      </div>
      <p className="text-dark-section-foreground/50">© {new Date().getFullYear()} MagicZap. Todos os direitos reservados.</p>
      <div className="flex items-center gap-4">
        <Link to="/sobre" className="hover:text-white transition-colors duration-200">
          Sobre
        </Link>
        <Link to="/terms-of-service" className="hover:text-white transition-colors duration-200">
          Termos de Uso
        </Link>
        <Link to="/privacy-policy" className="hover:text-white transition-colors duration-200">
          Privacidade
        </Link>
        <Link to="/auth" className="hover:text-white transition-colors duration-200">
          Área do Cliente
        </Link>
      </div>
    </motion.div>
  </footer>
);

export default LandingFooter;
