import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const URL = "https://mini-hack-heroes.lovable.app/guides/what-are-soulbound-tokens";
const TITLE = "Soulbound Tokens Meaning: A Practical Guide (SBTs)";
const DESCRIPTION =
  "What soulbound tokens are, how SBTs prove skills and achievements on-chain, and how Avax Hero Forge issues them as hackathon badges on Avalanche.";

export const Route = createFileRoute("/guides/what-are-soulbound-tokens")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "Avalanche Africa" },
          publisher: { "@type": "Organization", name: "Avax Hero Forge" },
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="min-h-screen flex flex-col hero-bg">
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-16 space-y-8">
          <header className="space-y-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Guide</p>
            <h1 className="text-4xl font-bold tracking-tight">
              Soulbound tokens, <span className="gradient-text">explained</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              A soulbound token (SBT) is a non-transferable NFT. Once it lands in your wallet it
              stays there — which is exactly what makes it useful as proof of something you did.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">What does &ldquo;soulbound&rdquo; mean?</h2>
            <p className="text-muted-foreground">
              Ordinary NFTs are assets: they can be bought, sold, and moved between wallets. A
              soulbound token removes transfer from the contract entirely. The token is bound to the
              wallet that received it, so it can&rsquo;t be traded, farmed, or bought second-hand.
              That single restriction turns a collectible into a credential.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">Why SBTs work as proof of achievement</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Unfakeable provenance.</strong> Anyone can check
                on-chain which contract issued the badge and when.
              </li>
              <li>
                <strong className="text-foreground">No secondary market.</strong> You can&rsquo;t
                buy the reputation — you have to earn it.
              </li>
              <li>
                <strong className="text-foreground">Portable identity.</strong> The badge follows
                the wallet, not a platform account, so it outlives the app that issued it.
              </li>
              <li>
                <strong className="text-foreground">Composable.</strong> Other apps can read your
                badges and gate access, grants, or roles on them.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">How Avax Hero Forge uses them</h2>
            <p className="text-muted-foreground">
              Every quest in the Team1 Africa MiniHack cohort maps to one badge type in our{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-sm">MiniHackAchievement</code>{" "}
              ERC-721 contract on Avalanche Fuji. When organizers approve your submission, the
              completion is attested on-chain and you claim the badge to your own wallet — the
              platform pays the gas, but it can only mint to the address on your profile.
            </p>
            <p className="text-muted-foreground">
              Quest badges are issued as non-transferable proofs of work; only the leaderboard
              trophies are transferable. The result is a wallet-native résumé of what you actually
              shipped during the hackathon.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">SBTs vs. regular NFTs vs. POAPs</h2>
            <p className="text-muted-foreground">
              A regular NFT proves ownership. A POAP proves you were somewhere. A soulbound token
              proves <em>you</em> did something and cannot hand that claim to anyone else. For
              hackathons, grants, and skill verification, that last property is the one that
              matters.
            </p>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card/60 p-6">
            <h2 className="text-xl font-semibold">Earn your first badge</h2>
            <p className="text-sm text-muted-foreground">
              Join the cohort, complete a quest, and claim a soulbound badge on Avalanche.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 font-semibold text-white"
              >
                Join the MiniHack
              </Link>
              <Link
                to="/leaderboard"
                className="rounded-xl border border-border bg-card/70 px-6 py-3 font-semibold hover:border-primary/60"
              >
                See the leaderboard
              </Link>
            </div>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
