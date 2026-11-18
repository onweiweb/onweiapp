export function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-onwei-beige bg-onwei-white p-5 ${className}`}
    >
      {children}
    </div>
  );
}
