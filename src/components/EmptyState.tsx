import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

/** Empty-state block for lists/tables that have no data yet. */
export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div
      role="status"
      className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center"
    >
      {icon ? <div className="mx-auto mb-3 text-muted-foreground">{icon}</div> : null}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
