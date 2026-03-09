import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  Receipt,
  DollarSign,
  MessageSquare,
  Cpu,
  AlertTriangle,
  Activity,
  ShieldOff,
  Menu,
  X,
  LogOut,
  Shield,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/monitoring", icon: Activity, label: "Monitoramento" },
  { to: "/admin/whatsapp", icon: Smartphone, label: "WhatsApp" },
  { to: "/admin/clients", icon: UserCheck, label: "Clientes" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Assinaturas" },
  { to: "/admin/payments", icon: Receipt, label: "Pagamentos" },
  { to: "/admin/financial", icon: DollarSign, label: "Financeiro" },
  { to: "/admin/messages", icon: MessageSquare, label: "Mensagens" },
  { to: "/admin/ai-usage", icon: Cpu, label: "Consumo Gemini" },
  { to: "/admin/logs", icon: AlertTriangle, label: "Logs & Erros" },
  { to: "/admin/users", icon: Users, label: "Usuários" },
  { to: "/admin/blocked", icon: ShieldOff, label: "Bloqueados" },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAdminAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[hsl(220,20%,7%)] text-[hsl(220,10%,90%)] flex">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[hsl(220,20%,9%)] border-r border-[hsl(220,15%,15%)] flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-5 border-b border-[hsl(220,15%,15%)]">
          <Shield className="w-6 h-6 text-blue-400" />
          <span className="text-lg font-bold tracking-tight">Admin Panel</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-500/15 text-blue-400"
                    : "text-[hsl(220,10%,55%)] hover:text-[hsl(220,10%,80%)] hover:bg-[hsl(220,15%,13%)]"
                )}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[hsl(220,15%,15%)]">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[hsl(220,10%,55%)] hover:text-red-400 hover:bg-red-500/10"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-4 lg:px-8 border-b border-[hsl(220,15%,15%)] bg-[hsl(220,20%,8%)] sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-medium text-[hsl(220,10%,55%)]">
            Secretária Digital · Painel Administrativo
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
