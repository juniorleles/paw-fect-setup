import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Appointments from "./pages/Appointments";

import MyAccount from "./pages/MyAccount";
import SubscriptionCancelled from "./pages/SubscriptionCancelled";
import UpgradeRequired from "./pages/UpgradeRequired";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

import AdminClients from "./pages/admin/AdminClients";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminFinancial from "./pages/admin/AdminFinancial";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminAiUsage from "./pages/admin/AdminAiUsage";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminMonitoring from "./pages/admin/AdminMonitoring";
import AdminBlocked from "./pages/admin/AdminBlocked";
import AdminLayout from "./components/admin/AdminLayout";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Support from "./pages/Support";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useOnboardingStatus, OnboardingProvider } from "@/hooks/useOnboardingStatus";
import { useTrialStatus } from "@/hooks/useTrialStatus";
const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isRecovery } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  // If in recovery mode, redirect to reset-password instead of dashboard
  if (isRecovery) {
    return <Navigate to="/reset-password" replace />;
  }
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { completed, loading } = useOnboardingStatus();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!completed) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

const SubscriptionGuard = ({ children }: { children: React.ReactNode }) => {
  const { status, loading } = useSubscription();
  const { phase, showUpgradeRequired, loading: trialLoading } = useTrialStatus();

  if (loading || trialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (status === "cancelled") {
    return <Navigate to="/subscription-cancelled" replace />;
  }
  if (showUpgradeRequired) {
    return <Navigate to="/upgrade" replace />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(220,20%,7%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
};

const DashboardRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <OnboardingGuard>
      <SubscriptionGuard>
        <DashboardLayout>{children}</DashboardLayout>
      </SubscriptionGuard>
    </OnboardingGuard>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
        <AuthProvider>
          <SubscriptionProvider>
            <OnboardingProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/landing" element={<Navigate to="/" replace />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/onboarding" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<DashboardRoute><Dashboard /></DashboardRoute>} />
                  <Route path="/appointments" element={<DashboardRoute><Appointments /></DashboardRoute>} />
                  
                  <Route path="/my-account" element={<DashboardRoute><MyAccount /></DashboardRoute>} />
                  <Route path="/support" element={<DashboardRoute><Support /></DashboardRoute>} />
                  <Route path="/settings" element={<DashboardRoute><Settings /></DashboardRoute>} />
                  <Route path="/subscription-cancelled" element={<ProtectedRoute><SubscriptionCancelled /></ProtectedRoute>} />
                  <Route path="/upgrade" element={<ProtectedRoute><UpgradeRequired /></ProtectedRoute>} />
                  {/* Admin routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  <Route path="/admin/monitoring" element={<AdminRoute><AdminMonitoring /></AdminRoute>} />
                  
                  <Route path="/admin/clients" element={<AdminRoute><AdminClients /></AdminRoute>} />
                  <Route path="/admin/subscriptions" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
                  <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
                  <Route path="/admin/financial" element={<AdminRoute><AdminFinancial /></AdminRoute>} />
                  <Route path="/admin/messages" element={<AdminRoute><AdminMessages /></AdminRoute>} />
                  <Route path="/admin/ai-usage" element={<AdminRoute><AdminAiUsage /></AdminRoute>} />
                  <Route path="/admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
                  <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                  <Route path="/admin/blocked" element={<AdminRoute><AdminBlocked /></AdminRoute>} />
                  {/* Legal pages */}
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </OnboardingProvider>
          </SubscriptionProvider>
        </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
