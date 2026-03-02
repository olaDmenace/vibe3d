"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

let cachedAuth: { isAuthenticated: boolean } | null = null;

export function useAuthStatus(): { isAuthenticated: boolean; isLoading: boolean } {
  const [isAuthenticated, setIsAuthenticated] = useState(cachedAuth?.isAuthenticated ?? false);
  const [isLoading, setIsLoading] = useState(cachedAuth === null);
  const fetched = useRef(false);

  useEffect(() => {
    if (cachedAuth !== null || fetched.current) return;
    fetched.current = true;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: unknown } }) => {
      const authed = !!user;
      cachedAuth = { isAuthenticated: authed };
      setIsAuthenticated(authed);
      setIsLoading(false);
    });
  }, []);

  return { isAuthenticated, isLoading };
}
