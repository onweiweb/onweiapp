import type { StatusTone } from "./statusTone";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-onwei-green text-onwei-blue",
  active: "bg-onwei-purple text-onwei-white",
  pending: "border border-onwei-blue bg-onwei-beige text-onwei-blue",
  problem: "bg-onwei-black text-onwei-white",
};

export function AdminBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[30px] px-3 py-1 font-grotesk text-xs font-medium uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
