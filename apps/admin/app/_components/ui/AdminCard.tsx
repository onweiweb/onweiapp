export function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[30px] border border-onwei-beige bg-onwei-white p-6 ${className}`}
    >
      {children}
    </div>
  );
}
