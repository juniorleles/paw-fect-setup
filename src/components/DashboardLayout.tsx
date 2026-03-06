import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAppointmentNotifications } from "@/hooks/useAppointmentNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, CalendarDays, Settings, LogOut, UserCircle, Headphones, Users, UserX, ClipboardList, BarChart3 } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const allNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, minPlan: "free", ownerOnly: false },
  { title: "Agendamentos", url: "/appointments", icon: CalendarDays, minPlan: "free", ownerOnly: false },
  { title: "Clientes Inativos", url: "/inactive-clients", icon: UserX, minPlan: "starter", ownerOnly: true },
  { title: "Relatório de Faltas", url: "/no-show-report", icon: ClipboardList, minPlan: "starter", ownerOnly: true },
  { title: "Relatório Financeiro", url: "/financial-report", icon: BarChart3, minPlan: "professional", ownerOnly: true },
  { title: "Profissionais", url: "/professionals", icon: Users, minPlan: "free", ownerOnly: true },
  { title: "Configurações", url: "/settings", icon: Settings, minPlan: "free", ownerOnly: true },
  { title: "Minha Conta", url: "/my-account", icon: UserCircle, minPlan: "free", ownerOnly: true },
  { title: "Suporte", url: "/support", icon: Headphones, minPlan: "free", ownerOnly: false },
];

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, professional: 2 };

const DashboardSidebarContent = () => {
  const { user, signOut } = useAuth();
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const { setOpenMobile, isMobile } = useSidebar();
  const [isProfessional, setIsProfessional] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("is_professional", { p_user_id: user.id }).then(({ data }) => {
      setIsProfessional(!!data);
    });
  }, [user]);

  const userRank = PLAN_RANK[plan] ?? 0;
  const navItems = allNavItems.filter((item) => {
    if (userRank < (PLAN_RANK[item.minPlan] ?? 0)) return false;
    if (item.ownerOnly && isProfessional) return false;
    return true;
  });
  const handleSignOut = async () => {
    if (isMobile) setOpenMobile(false);
    await signOut();
    navigate("/auth");
  };

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarContent className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2">
        <img src={logo} alt="MagicZap" className="h-14 w-auto" />
      </div>

      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    end
                    className="hover:bg-muted/50"
                    activeClassName="bg-muted text-primary font-medium"
                    onClick={closeMobileSidebar}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Sign out at bottom */}
      <div className="mt-auto p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </SidebarContent>
  );
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  useAppointmentNotifications();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border">
          <DashboardSidebarContent />
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border px-4 md:hidden">
            <SidebarTrigger />
          </header>
          <main className="flex-1 flex flex-col relative">
            {children}
            {location.pathname !== "/support" && (
              <Link
                to="/support"
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors hover:scale-105 active:scale-95"
                aria-label="Suporte"
              >
                <Headphones className="w-6 h-6" />
              </Link>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
