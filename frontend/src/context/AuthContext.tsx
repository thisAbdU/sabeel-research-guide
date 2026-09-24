"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

export interface SignUpProfile {
  fullName?: string;
  institution?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  institution?: string;
  displayName?: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  displayName: string;

  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: Error | null;
    session: AuthSession | null;
  }>;

  signUp: (
    email: string,
    password: string,
    profile?: SignUpProfile
  ) => Promise<{
    error: Error | null;
    session: AuthSession | null;
    user: AuthUser | null;
  }>;

  signOut: () => Promise<{
    error: Error | null;
  }>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  /*
   * Check whether the user is already authenticated
   * when the application starts.
   */
  React.useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const data = await apiFetch<{
          user: AuthUser;
        }>("/api/auth/me");

        if (!isMounted) return;

        setUser(data.user);
        setSession({
          user: data.user,
        });
      } catch (error) {
        if (!isMounted) return;

        setUser(null);
        setSession(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * Login
   */
  const signIn = async (
    email: string,
    password: string
  ) => {
    try {
      const data = await apiFetch<{
        user: AuthUser;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const nextUser = data.user;

      const nextSession: AuthSession = {
        user: nextUser,
      };

      setUser(nextUser);
      setSession(nextSession);

      return {
        error: null,
        session: nextSession,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to sign in"),
        session: null,
      };
    }
  };

  /*
   * Signup
   */
  const signUp = async (
    email: string,
    password: string,
    profile?: SignUpProfile
  ) => {
    try {
      const trimmedEmail = email.trim();

      const fullName =
        profile?.fullName?.trim() ||
        trimmedEmail.split("@")[0];

      const institution =
        profile?.institution?.trim() || undefined;

      const data = await apiFetch<{
        user: AuthUser;
        session?: AuthSession | null;
      }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          fullName,
          institution,
        }),
      });

      const nextUser = data.user;

      /*
       * If your backend creates a session immediately,
       * use it. Otherwise session stays null and the
       * signup page can show the confirmation message.
       */
      const nextSession = data.session ?? null;

      if (nextUser) {
        setUser(nextUser);
      }

      if (nextSession) {
        setSession(nextSession);
      }

      return {
        error: null,
        session: nextSession,
        user: nextUser ?? null,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to create account"),
        session: null,
        user: null,
      };
    }
  };

  /*
   * Logout
   */
  const signOut = async () => {
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
      });

      setUser(null);
      setSession(null);

      return {
        error: null,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to sign out"),
      };
    }
  };

  const displayName = React.useMemo(() => {
    if (!user) return "";

    return (
      user.displayName ||
      user.fullName ||
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}