import { Trophy, Target, Flame, Sparkles, Users, Sword } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  sword: Sword,
  flame: Flame,
  sparkles: Sparkles,
  users: Users,
  target: Target,
};

export function BadgeCard({
  title,
  subtitle,
  icon = "sparkles",
  earned = false,
  progress,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  earned?: boolean;
  progress?: number;
}) {
  const Icon = ICONS[icon] ?? Sparkles;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
        earned
          ? "border-primary/60 bg-gradient-to-br from-primary/10 via-card to-accent/10 glow-ring"
          : "border-border bg-card/60"
      }`}
    >
      <div
        className={`grid place-items-center h-14 w-14 rounded-2xl ${
          earned
            ? "bg-gradient-to-br from-primary to-accent text-white"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      {typeof progress === "number" && (
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
      {earned && (
        <span className="absolute top-3 right-3 rounded-full bg-success/20 text-success text-[10px] uppercase font-bold px-2 py-0.5">
          Earned
        </span>
      )}
    </div>
  );
}
