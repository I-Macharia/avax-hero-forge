import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mountain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · MiniHack Heroes" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useSession();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, Hero.");
      }
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) throw res.error;
      if (res.redirected) return;
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen hero-bg grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 backdrop-blur p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent glow-ring">
            <Mountain className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-xl font-bold">MiniHack <span className="gradient-text">Heroes</span></h1>
            <p className="text-xs text-muted-foreground">
              {mode === "signin" ? "Welcome back" : "Become a Hero"}
            </p>
          </div>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-lg border border-border bg-background/40 px-4 py-2.5 font-medium hover:border-primary/60 disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="w-full rounded-lg bg-input/50 border border-border px-3 py-2.5 focus:outline-none focus:border-primary"
            />
          )}
          <input
            required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg bg-input/50 border border-border px-3 py-2.5 focus:outline-none focus:border-primary"
          />
          <input
            required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" minLength={6}
            className="w-full rounded-lg bg-input/50 border border-border px-3 py-2.5 focus:outline-none focus:border-primary"
          />
          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2.5 font-semibold text-white glow-ring disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
