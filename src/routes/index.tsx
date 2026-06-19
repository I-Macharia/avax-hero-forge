import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Sparkles, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Team1 MiniHack Heroes — Avalanche Africa" },
      { name: "description", content: "Attend sessions, complete quests, and mint soulbound NFT badges on Avalanche." },
      { property: "og:title", content: "Team1 MiniHack Heroes" },
      { property: "og:description", content: "Gamified Avalanche MiniHack — Nairobi & remote." },
    ],
  }),
  component: Landing,
});

function useLiveStats() {
  return useQuery({
    queryKey: ["live-stats"],
    queryFn: async () => {
      const [p, m, q] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("nft_mints").select("id", { count: "exact", head: true }),
        supabase.from("quest_completions").select("id", { count: "exact", head: true }),
      ]);
      return {
        participants: p.count ?? 0,
        nfts: m.count ?? 0,
        quests: q.count ?? 0,
      };
    },
    refetchInterval: 15_000,
  });
}

function Landing() {
  const { data: stats } = useLiveStats();
  return (
    <div className="min-h-screen flex flex-col hero-bg">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 pt-16 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium"
          >
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Avalanche Fuji · Cohort live in Nairobi
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 text-5xl sm:text-7xl font-bold tracking-tight"
          >
            Team1 <span className="gradient-text">MiniHack</span>
            <br />
            Heroes
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Show up. Ship quests. Mint soulbound on-chain badges that prove you built on
            Avalanche. Climb the leaderboard. Become a Hero.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <Link
              to="/auth"
              className="rounded-xl bg-gradient-to-r from-primary to-accent px-7 py-3.5 font-semibold text-white glow-ring hover:scale-[1.02] transition-transform"
            >
              Join the MiniHack
            </Link>
            <Link
              to="/leaderboard"
              className="rounded-xl border border-border bg-card/70 px-7 py-3.5 font-semibold hover:border-primary/60"
            >
              View leaderboard
            </Link>
          </motion.div>

          {/* Live stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={<Users className="h-5 w-5" />} value={stats?.participants ?? 0} label="Heroes joined" />
            <StatCard icon={<Sparkles className="h-5 w-5" />} value={stats?.nfts ?? 0} label="NFTs minted" />
            <StatCard icon={<Trophy className="h-5 w-5" />} value={stats?.quests ?? 0} label="Quests completed" />
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-4 pb-24 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Zap />}
            title="Embedded wallets"
            body="Onboard with email or Google — no seed phrases. Your wallet rides on Avalanche."
          />
          <FeatureCard
            icon={<Trophy />}
            title="Soulbound badges"
            body="Every quest you complete becomes a permanent on-chain ERC-721 you can flex forever."
          />
          <FeatureCard
            icon={<Sparkles />}
            title="Real-time gameplay"
            body="Attendance, quests, and points update live. Confetti on every successful mint."
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 text-left"
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        {icon} <span>{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold font-display gradient-text">
        {value.toLocaleString()}
      </div>
    </motion.div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-border bg-card/60 p-6"
    >
      <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </motion.div>
  );
}
