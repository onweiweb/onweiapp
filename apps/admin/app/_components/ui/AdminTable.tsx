export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[20px] border border-onwei-blue/10">
      <table className="w-full min-w-max border-collapse bg-onwei-white text-sm">
        {children}
      </table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-onwei-beige bg-onwei-beige/40 text-left font-grotesk uppercase tracking-wide text-onwei-blue">
        {children}
      </tr>
    </thead>
  );
}

export function AdminTableHeaderCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <th className="px-4 py-2 text-xs font-medium">{children}</th>;
}

export function AdminTableRow({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-onwei-beige/60 last:border-b-0">
      {children}
    </tr>
  );
}

export function AdminTableCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-2 align-middle ${className}`}>{children}</td>;
}
