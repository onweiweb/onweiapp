/**
 * One form field: a label above, optional help text under it, and an error
 * line. Wrap an AdminInput, AdminSelect or AdminTextarea in it.
 */
export function Field({
  label,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-onwei-blue">{label}</span>
      {children}
      {hint ? <span className="text-xs text-onwei-blue/70">{hint}</span> : null}
      {error ? <span className="text-xs text-onwei-black">{error}</span> : null}
    </label>
  );
}
