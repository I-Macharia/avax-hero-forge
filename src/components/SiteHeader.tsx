import { Link, useRouterState } from "@tanstack/react-router";
import { Mountain, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useIsOrganizer } from "@/hooks/useRoles";

const nav = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard", auth: true },
  { to: "/quests", label: "Quests", auth: true },
  { to: "/leaderboard", label: "Leaderboard" },
];

export function SiteHeader() {
  const { user } = useSession();
  const isOrganizer = useIsOrganizer();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent glow-ring">
            <Mountain className="h-4 w-4 text-white" />
          </span>
          <span className="hidden sm:inline">MiniHack <span className="gradient-text">Heroes</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => {
            if (n.auth && !user) return null;
            const active = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
          {user && isOrganizer && (
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                path === "/admin" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile" className="rounded-full h-9 w-9 grid place-items-center bg-card border border-border hover:border-primary/60">
                <User className="h-4 w-4" />
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-md p-2 text-muted-foreground hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-medium text-white glow-ring"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
