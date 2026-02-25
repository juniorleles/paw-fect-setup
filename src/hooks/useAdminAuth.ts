import { useState, useEffect } from "react";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import type { User } from "@supabase/supabase-js";

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for admin session changes
    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!data && !error);
        setLoading(false);
      }
    );

    // Check initial session
    supabaseAdmin.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data && !error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    return supabaseAdmin.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    return supabaseAdmin.auth.signOut({ scope: "local" });
  };

  return { user, isAdmin, loading, signIn, signOut };
};
