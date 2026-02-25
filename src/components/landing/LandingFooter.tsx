import { Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
        <Briefcase className="w-5 h-5 text-primary" />
        <span className="font-display font-bold text-foreground">Secretária Digital</span>
      </div>
      <p>© {new Date().getFullYear()} Secretária Digital. Todos os direitos reservados.</p>
      <Link to="/auth" className="hover:text-foreground transition-colors">
        Área do Cliente
      </Link>
    </motion.div>
  </footer>
);

export default LandingFooter;
