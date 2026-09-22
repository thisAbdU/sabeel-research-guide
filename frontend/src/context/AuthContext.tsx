"use client";

import * as React from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export interface SignUpProfile {
  fullName?: string;
  institution?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; session: Session | null }>;
  signUp: (email: string, password: string, profile?: SignUpProfile) => Promise<{ error: AuthError | null; session: Session | null; user: User | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;

    // Retrieve initial session from Supabase client
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }).catch((err) => {
      console.error("Error retrieving initial Supabase session:", err);
      if (isMounted) setIsLoading(false);
    });

    // Listen to all authentication state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return { error, session: data.session };
  };

  const signUp = async (email: string, password: string, profile?: SignUpProfile) => {
    const trimmedEmail = email.trim();
    const fullName = profile?.fullName?.trim() || trimmedEmail.split("@")[0];
    const institution = profile?.institution?.trim();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          display_name: fullName,
          full_name: fullName,
          institution: institution || undefined,
        },
      },
    });

    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
    }

    return { error, session: data.session, user: data.user };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setSession(null);
      setUser(null);
    }
    return { error };
  };

  const displayName = React.useMemo(() => {
    if (!user) return "";
    return (
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Researcher"
    );
  }, [user]);

  const value = React.useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      displayName,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, isLoading, displayName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
