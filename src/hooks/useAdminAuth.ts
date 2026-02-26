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
      try {
        const { data, error } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        return !!data && !error;
      } catch {
        return false;
      }
    };

    // Safety timeout — if nothing resolves in 5s, stop loading
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("[useAdminAuth] timeout — forcing loading=false");
        setLoading(false);
      }
    }, 5000);

    // Use onAuthStateChange which fires INITIAL_SESSION immediately
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
        if (mounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await Promise.race([
        supabaseAdmin.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Login timeout")), 10000)
        ),
      ]);
      return result;
    } catch (err: any) {
      console.error("[useAdminAuth] signIn error:", err);
      return { data: { user: null, session: null }, error: err };
    }
  };

  const signOut = async () => {
    return supabaseAdmin.auth.signOut({ scope: "local" });
  };

  return { user, isAdmin, loading, signIn, signOut };
};
