import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import type { User } from "@supabase/supabase-js";

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async (userId: string) => {
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return !!data && !error;
    };

    // Get initial session
    supabaseAdmin.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const admin = await checkAdmin(currentUser.id);
        if (mounted) setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }
      if (mounted) setLoading(false);
    });

    // Listen for changes after initial load
    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const admin = await checkAdmin(currentUser.id);
          if (mounted) setIsAdmin(admin);
        } else {
          setIsAdmin(false);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return supabaseAdmin.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    return supabaseAdmin.auth.signOut({ scope: "local" });
  };

  return { user, isAdmin, loading, signIn, signOut };
};
