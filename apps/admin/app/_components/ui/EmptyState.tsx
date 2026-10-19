/** Shown instead of an empty table. Says what is missing and what to do. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-onwei-blue/25 px-6 py-10 text-center">
      <p className="font-medium text-onwei-blue">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-onwei-blue/70">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
