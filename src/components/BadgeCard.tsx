import { Trophy, Target, Flame, Sparkles, Users, Sword, Loader2, CheckCircle2 } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  sword: Sword,
  flame: Flame,
  sparkles: Sparkles,
  users: Users,
  target: Target,
};

/**
 * Resolves a stored artwork reference into a renderable <img> src.
 * - Absolute http(s) URLs pass through untouched.
 * - ipfs:// URIs are rewritten to a public gateway.
 * - Relative paths (e.g. "badges/badge-01-....png" from /public) are
 *   prefixed with Vite's BASE_URL so they resolve correctly even when the
 *   app is deployed under a subpath (e.g. GitHub Pages' /avax-hero-forge/).
 */
export function resolveArtworkUrl(src?: string | null): string | null {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${src.slice("ipfs://".length)}`;
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  return `${base}${src.replace(/^\//, "")}`;
}

export type ClaimState = "none" | "eligible" | "claiming" | "claimed" | "locked";

export function BadgeCard({
  title,
  subtitle,
  icon = "sparkles",
  earned = false,
  progress,
  imageUrl,
  claimState = "none",
  onClaim,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  earned?: boolean;
  progress?: number;
  /** Path or URL to the badge artwork (quest.cover_image_url). Falls back to a lucide icon when absent. */
  imageUrl?: string | null;
  /** Drives the optional claim button rendered at the bottom of the card. */
  claimState?: ClaimState;
  onClaim?: () => void;
}) {
  const Icon = ICONS[icon] ?? Sparkles;
  const artwork = resolveArtworkUrl(imageUrl);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        earned
          ? "border-primary/60 bg-gradient-to-br from-primary/10 via-card to-accent/10 glow-ring"
          : "border-border bg-card/60"
      }`}
    >
      {artwork ? (
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img
            src={artwork}
            alt={title}
            loading="lazy"
            className={`h-full w-full object-cover ${claimState === "locked" ? "grayscale opacity-50" : ""}`}
          />
        </div>
      ) : (
        <div className="p-5 pb-0">
          <div
            className={`grid place-items-center h-14 w-14 rounded-2xl ${
              earned
                ? "bg-gradient-to-br from-primary to-accent text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      )}

      <div className="p-5">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        {typeof progress === "number" && (
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        )}

        {claimState === "eligible" && onClaim && (
          <button
            onClick={onClaim}
            className="mt-3 w-full rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
          >
            Claim badge
          </button>
        )}
        {claimState === "claiming" && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Minting…
          </div>
        )}
        {claimState === "claimed" && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-success/10 text-success px-4 py-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Claimed
          </div>
        )}
        {claimState === "locked" && (
          <div className="mt-3 rounded-xl border border-dashed border-border/60 px-4 py-2 text-center text-xs text-muted-foreground">
            Complete the quest to unlock
          </div>
        )}
      </div>

      {earned && claimState === "none" && (
        <span className="absolute top-3 right-3 rounded-full bg-success/20 text-success text-[10px] uppercase font-bold px-2 py-0.5">
          Earned
        </span>
      )}
    </div>
  );
}
