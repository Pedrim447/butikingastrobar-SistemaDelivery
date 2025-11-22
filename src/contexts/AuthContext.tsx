import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isDeliveryRider: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeliveryRider, setIsDeliveryRider] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Chamar checkUserRole de forma assíncrona
        checkUserRole(session.user.id);
      } else {
        setIsAdmin(false);
        setIsDeliveryRider(false);
      }
    });

    // Check for existing session
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Getting initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await checkUserRole(session.user.id);
      }
      setLoading(false);
    };

    initAuth();

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      console.log('Checking user role for:', userId);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      console.log('Role query result:', { data, error });

      if (!error && data) {
        console.log('Setting isAdmin:', data.role === "admin", 'Setting isDeliveryRider:', data.role === "delivery_rider");
        setIsAdmin(data.role === "admin");
        setIsDeliveryRider(data.role === "delivery_rider");
      } else {
        console.log('No role found or error, setting to false');
        setIsAdmin(false);
        setIsDeliveryRider(false);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setIsAdmin(false);
      setIsDeliveryRider(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          phone
        }
      },
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsDeliveryRider(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isDeliveryRider,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
