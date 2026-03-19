import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isDeliveryRider: boolean;
  isPDV: boolean;
  loading: boolean;
  checkingRole: boolean;
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
  const [isPDV, setIsPDV] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingRole, setCheckingRole] = useState(false);
  const isCheckingRoleRef = useRef(false);
  const lastCheckedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Check for existing session FIRST before setting up listener
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;

        // Se houve erro ao recuperar sessão (token expirado), limpar sessão
        if (sessionError) {
          console.warn('Session recovery failed, signing out:', sessionError.message);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        console.log('Initial session loaded:', session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setCheckingRole(true);
          await checkUserRole(session.user.id);
          if (mounted) setCheckingRole(false);
        }
      } catch (error) {
        console.error('Error loading initial session:', error);
        // Em caso de erro inesperado, limpar estado de auth
        try { await supabase.auth.signOut(); } catch {}
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Setup auth state listener AFTER initial session is loaded
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, session?.user?.email);
      
      // Avoid processing INITIAL_SESSION event since we handle it above
      if (event === 'INITIAL_SESSION') return;

      // Se o token foi revogado/expirou, limpar tudo
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, clearing session');
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setIsDeliveryRider(false);
        setIsPDV(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer Supabase calls to prevent deadlock, but make it immediate
        setCheckingRole(true);
        Promise.resolve().then(() => {
          if (mounted) {
            checkUserRole(session.user.id).finally(() => {
              if (mounted) setCheckingRole(false);
            });
          }
        });
      } else {
        setIsAdmin(false);
        setIsDeliveryRider(false);
        setIsPDV(false);
        setCheckingRole(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUserRole = async (userId: string) => {
    // Evitar chamadas múltiplas simultâneas
    if (isCheckingRoleRef.current) {
      console.log('Role check already in progress, skipping');
      return;
    }

    // Se já checamos para este usuário, não precisamos checar novamente
    if (lastCheckedUserIdRef.current === userId) {
      console.log('Role already checked for this user');
      return;
    }

    isCheckingRoleRef.current = true;
    
    try {
      console.log('Checking user role for:', userId);
      
      // Buscar todas as roles do usuário
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      console.log('Role query result:', { data, error });

      if (!error && data && data.length > 0) {
        // Extrair todas as roles
        const roles = data.map(r => r.role);
        
        console.log('User roles:', roles);
        
        // Verificar se tem cada role
        setIsAdmin(roles.includes("admin"));
        setIsDeliveryRider(roles.includes("delivery_rider"));
        setIsPDV(roles.includes("pdv"));
        lastCheckedUserIdRef.current = userId;
      } else {
        console.log('No role found or error, setting to false');
        setIsAdmin(false);
        setIsDeliveryRider(false);
        setIsPDV(false);
        lastCheckedUserIdRef.current = userId;
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      setIsAdmin(false);
      setIsDeliveryRider(false);
      setIsPDV(false);
    } finally {
      isCheckingRoleRef.current = false;
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
    setIsPDV(false);
    lastCheckedUserIdRef.current = null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isDeliveryRider,
        isPDV,
        loading,
        checkingRole,
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
