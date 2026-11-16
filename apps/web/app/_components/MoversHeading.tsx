/**
 * Reviews heading. "Chosen by N+ everyday movers" once staff set the number
 * in admin Settings, "Chosen by everyday movers" until then (client feedback
 * 2026-11-16: start without a number, add it as it grows).
 */
export function MoversHeading({ count }: { count: number | null }) {
  return (
    <>
      Chosen by {count && count > 0 ? `${count.toLocaleString("en-IN")}+ ` : ""}
      <br />
      everyday movers
    </>
  );
}
