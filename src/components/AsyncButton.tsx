import { type ButtonHTMLAttributes, type ReactNode, useState } from "react";
import { toast } from "sonner";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children"> & {
  onRun: () => Promise<unknown>;
  successMessage?: string;
  errorPrefix?: string;
  children: ReactNode;
  pendingChildren?: ReactNode;
};

/**
 * Button that runs an async handler with built-in pending state,
 * error toast, and optional success toast. Prevents double-submits.
 */
export function AsyncButton({
  onRun,
  successMessage,
  errorPrefix = "Failed",
  children,
  pendingChildren = "Working…",
  disabled,
  ...rest
}: Props) {
  const [pending, setPending] = useState(false);
  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      onClick={async () => {
        setPending(true);
        try {
          await onRun();
          if (successMessage) toast.success(successMessage);
        } catch (err) {
          toast.error(`${errorPrefix}: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? pendingChildren : children}
    </button>
  );
}
