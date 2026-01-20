import { useState, useEffect, createContext, useContext, ReactNode, useRef } from "react";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type SupabaseClientLike = any;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // IMPORTANT: Don't import the backend client at module scope.
  // Mobile Safari can struggle with the initial JS parse; defer the heavy chunk.
  const supabaseRef = useRef<SupabaseClientLike | null>(null);

  const getClient = async (): Promise<SupabaseClientLike> => {
    if (supabaseRef.current) return supabaseRef.current;
    const mod = await import("@/integrations/supabase/client");
    supabaseRef.current = (mod as any).supabase;
    return supabaseRef.current;
  };

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    // If still loading after 5s, stop loading to show UI
    const timeoutId = window.setTimeout(() => {
      setLoading(false);
    }, 5000);

    (async () => {
      try {
        const supabase = await getClient();
        if (cancelled) return;

        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange((_event: unknown, nextSession: Session | null) => {
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setLoading(false);
        });

        subscription = sub;

        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      } catch {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = await getClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const supabase = await getClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const supabase = await getClient();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
