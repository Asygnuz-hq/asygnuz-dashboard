"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("rol").eq("id", user.id).maybeSingle();
      if (!cancelado) setIsAdmin(data?.rol === "admin");
    }
    load();
    return () => {
      cancelado = true;
    };
  }, []);

  return isAdmin;
}
