import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PET_NICHES = ["petshop", "veterinaria"];

export const useNiche = () => {
  const { user } = useAuth();
  const [niche, setNiche] = useState<string>("barbearia");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("pet_shop_configs")
        .select("niche")
        .eq("user_id", user.id)
        .limit(1);
      if (data && data.length > 0) {
        setNiche(data[0].niche || "petshop");
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  return {
    niche,
    isPetNiche: PET_NICHES.includes(niche),
    loading,
  };
};
