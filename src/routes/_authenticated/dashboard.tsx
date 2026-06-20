import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Target, Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { BadgeCard } from "@/components/BadgeCard";
import { txUrl } from "@/lib/contract/config";
import NFTGallery from "@/components/NFTGallery";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · MiniHack Heroes" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const [profile, attendance, sessions, quests, completions, mints] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("attendance").select("*, sessions(*)").eq("user_id", user.id),
        supabase.from("sessions").select("id"),
        supabase.from("quests").select("*").eq("active", true),
        supabase.from("quest_completions").select("*").eq("user_id", user.id),
        supabase.from("nft_mints").select("*, quests(*)").eq("user_id", user.id).order("minted_at", { ascending: false }),
      ]);
      return {
        profile: profile.data,
        attendance: attendance.data ?? [],
        totalSessions: sessions.data?.length ?? 0,
        quests: quests.data ?? [],
        completions: completions.data ?? [],
        mints: mints.data ?? [],
      };
    },
  });

  if (!data) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  const attendancePct = data.totalSessions
    ? Math.round((data.attendance.length / data.totalSessions) * 100)
    : 0;
  const questPct = data.quests.length
    ? Math.round((data.completions.length / data.quests.length) * 100)
    : 0;
  const attendancePoints = data.attendance.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n, a: any) => n + (a.sessions?.points ?? 10),
    0,
  );
  const questPoints = data.completions.reduce((n, c) => {
    const q = data.quests.find((x) => x.id === c.quest_id);
    return n + (q?.points ?? 0);
  }, 0);
  const totalPoints = attendancePoints + questPoints;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-3xl font-bold">{data.profile?.display_name ?? "Hero"} 👋</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ProgressCard
          icon={<Calendar />}
          label="Attendance"
          value={`${data.attendance.length}/${data.totalSessions}`}
          pct={attendancePct}
        />
        <ProgressCard
          icon={<Target />}
          label="Quests"
          value={`${data.completions.length}/${data.quests.length}`}
          pct={questPct}
        />
        <ProgressCard
          icon={<Trophy />}
          label="Total points"
          value={totalPoints.toLocaleString()}
          pct={Math.min(100, totalPoints / 5)}
        />
      </div>

  <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your NFT badges
        </h2>
        {data.mints.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No badges yet — complete a quest and mint your first one.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.mints.map((m) => (
              <motion.a
                key={m.id}
                href={txUrl(m.tx_hash)}
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -4 }}
                className="block"
              >
                <BadgeCard
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  title={(m as any).quests?.title ?? `Badge #${m.token_id}`}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  icon={(m as any).quests?.icon ?? "sparkles"}
                  subtitle={`Token #${m.token_id ?? "?"}`}
                  earned
                />
              </motion.a>
            ))}
          </div>
        )}
        {/* Thirdweb-powered gallery (additional on-chain view) */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-3">On-chain view</h3>
          {/* import dynamically to avoid SSR issues */}
          <React.Suspense fallback={<div className="text-muted-foreground">Loading gallery…</div>}>
            <NFTGallery />
          </React.Suspense>
        </div>
      </section>
    </div>
  );
}

function ProgressCard({ icon, label, value, pct }: { icon: React.ReactNode; label: string; value: string; pct: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground flex items-center gap-2">{icon} {label}</span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="mt-3 text-3xl font-bold font-display">{value}</div>
      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
